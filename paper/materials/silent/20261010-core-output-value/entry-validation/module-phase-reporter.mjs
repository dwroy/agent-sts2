export default class ModulePhaseReporter {
  log(phase, m) { console.error(JSON.stringify({ diagnostic: "sandbox-phase", at: new Date().toISOString(), phase, module: m?.moduleId })); }
  onInit() { this.log("init"); }
  onTestRunStart() { this.log("run-start"); }
  onTestModuleQueued(m) { this.log("module-queued", m); }
  onTestModuleCollected(m) { this.log("module-collected", m); }
  onTestModuleStart(m) { this.log("module-start", m); }
  onTestModuleEnd(m) { this.log("module-end", m); }
  onTestRunEnd() { this.log("run-end"); }
}
