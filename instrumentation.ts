export async function register() {
  if (
    process.env.NEXT_RUNTIME === 'nodejs' &&
    process.env.NEXT_PHASE !== 'phase-production-build' &&
    process.env.npm_lifecycle_event !== 'build'
  ) {
    const { bus } = await import('./src/modules/realtime/bus');
    bus.init();
  }
}
