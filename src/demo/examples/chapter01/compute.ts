export {};

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`页面缺少 ${selector}`);
  return element;
}

const status = requireElement<HTMLPreElement>('#status');

const computeSource = /* wgsl */ `
@group(0) @binding(0) var<storage, read_write> data: array<f32>;

@compute @workgroup_size(1) fn doubleValues(
  @builtin(global_invocation_id) id: vec3u,
) {
  if (id.x < arrayLength(&data)) {
    data[id.x] = data[id.x] * 2.0;
  }
}
`;

async function runCompute() {
  if (!navigator.gpu) throw new Error('当前浏览器没有暴露 WebGPU');
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error('没有可用的 GPUAdapter');
  const device = await adapter.requestDevice();

  const input = new Float32Array([1, 3, 5]);
  let workBuffer: GPUBuffer | undefined;
  let resultBuffer: GPUBuffer | undefined;
  let resultMapped = false;

  try {
    const module = device.createShaderModule({
      label: '数值翻倍 Compute Shader',
      code: computeSource,
    });
    const compilationInfo = await module.getCompilationInfo();
    const errors = compilationInfo.messages.filter((message) => message.type === 'error');
    if (errors.length > 0) {
      throw new Error(errors.map((message) => message.message).join('\n'));
    }

    const pipeline = await device.createComputePipelineAsync({
      label: '数值翻倍 Compute Pipeline',
      layout: 'auto',
      compute: { module, entryPoint: 'doubleValues' },
    });

    workBuffer = device.createBuffer({
      label: '计算输入与输出 Storage Buffer',
      size: input.byteLength,
      usage: GPUBufferUsage.STORAGE
        | GPUBufferUsage.COPY_DST
        | GPUBufferUsage.COPY_SRC,
    });
    resultBuffer = device.createBuffer({
      label: '计算结果 Readback Buffer',
      size: input.byteLength,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    device.queue.writeBuffer(workBuffer, 0, input);

    const bindGroup = device.createBindGroup({
      label: '计算数据 Bind Group',
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: workBuffer } }],
    });

    const encoder = device.createCommandEncoder({
      label: 'Compute 与回读 Command Encoder',
    });
    const pass = encoder.beginComputePass({ label: '数值翻倍 Compute Pass' });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(input.length);
    pass.end();

    encoder.copyBufferToBuffer(
      workBuffer, 0,
      resultBuffer, 0,
      input.byteLength,
    );
    device.queue.submit([encoder.finish()]);

    await resultBuffer.mapAsync(GPUMapMode.READ);
    resultMapped = true;
    const result = new Float32Array(resultBuffer.getMappedRange().slice(0));
    resultBuffer.unmap();
    resultMapped = false;

    status.textContent = `输入 [${input.join(', ')}] → 输出 [${result.join(', ')}]`;
  } finally {
    if (resultMapped) resultBuffer?.unmap();
    workBuffer?.destroy();
    resultBuffer?.destroy();
    device.destroy();
  }
}

runCompute().catch((error: unknown) => {
  status.textContent = error instanceof Error ? error.message : String(error);
});
