import { compilationErrorMessage } from './webgpu';

export const DOUBLE_VALUES_WGSL = `@group(0) @binding(0) var<storage, read_write> data: array<f32>;

@compute @workgroup_size(64) fn doubleValues(
  @builtin(global_invocation_id) id: vec3u,
) {
  let index = id.x;
  if (index >= arrayLength(&data)) {
    return;
  }
  data[index] = data[index] * 2.0;
}`;

export interface ComputeResult {
  values: number[];
  workgroupCount: number;
  byteLength: number;
}

export function parseNumberList(source: string): number[] {
  const parts = source.split(/[\s,，]+/).filter(Boolean);
  if (parts.length === 0) throw new Error('请至少输入一个数字。');
  if (parts.length > 256) throw new Error('一次最多计算 256 个数字。');
  return parts.map((part) => {
    const value = Number(part);
    if (!Number.isFinite(value)) throw new Error(`“${part}” 无法转换成有限数字。`);
    return value;
  });
}

export async function doubleValuesOnGpu(values: readonly number[]): Promise<ComputeResult> {
  if (values.length === 0) throw new Error('请至少提供一个数字。');
  if (values.length > 256) throw new Error('一次最多计算 256 个数字。');
  if (values.some((value) => !Number.isFinite(value))) throw new Error('所有输入都必须是有限数字。');
  const input = new Float32Array(values);
  if (!navigator.gpu) throw new Error('当前浏览器没有暴露 WebGPU。');

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error('当前环境没有可用的 GPUAdapter。');
  const device = await adapter.requestDevice();
  let workBuffer: GPUBuffer | null = null;
  let resultBuffer: GPUBuffer | null = null;
  let resultMapped = false;

  try {
    const module = device.createShaderModule({
      label: '数值翻倍 Compute Shader',
      code: DOUBLE_VALUES_WGSL,
    });
    const compilationError = compilationErrorMessage(await module.getCompilationInfo());
    if (compilationError) throw new Error(compilationError);

    const pipeline = await device.createComputePipelineAsync({
      label: '数值翻倍 Compute Pipeline',
      layout: 'auto',
      compute: { module, entryPoint: 'doubleValues' },
    });

    workBuffer = device.createBuffer({
      label: '计算输入与输出 Storage Buffer',
      size: input.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    });
    resultBuffer = device.createBuffer({
      label: '计算结果 Readback Buffer',
      size: input.byteLength,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    device.queue.writeBuffer(workBuffer, 0, input);

    const bindGroup = device.createBindGroup({
      label: 'Compute Storage Bind Group',
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: workBuffer } }],
    });

    const workgroupCount = Math.ceil(input.length / 64);
    const encoder = device.createCommandEncoder({ label: 'Compute 与回读命令编码器' });
    const pass = encoder.beginComputePass({ label: '数值翻倍 Compute Pass' });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(workgroupCount);
    pass.end();
    encoder.copyBufferToBuffer(workBuffer, 0, resultBuffer, 0, input.byteLength);
    device.queue.submit([encoder.finish()]);

    await resultBuffer.mapAsync(GPUMapMode.READ);
    resultMapped = true;
    const copied = new Float32Array(resultBuffer.getMappedRange().slice(0));
    resultBuffer.unmap();
    resultMapped = false;

    return {
      values: Array.from(copied),
      workgroupCount,
      byteLength: input.byteLength,
    };
  } finally {
    if (resultMapped) resultBuffer?.unmap();
    workBuffer?.destroy();
    resultBuffer?.destroy();
    device.destroy();
  }
}
