export default class PhaseReporter {
  onInit() { console.error("DIAG phase=init"); }
  onTestModuleCollected(m) { console.error("DIAG phase=collected", m.moduleId); }
  onTestModuleStart(m) { console.error("DIAG phase=module-start", m.moduleId); }
  onTestCaseReady(t) { console.error("DIAG phase=test-ready", t.fullName); }
  onTestCaseResult(t) { console.error("DIAG phase=test-result", t.fullName); }
  onTestRunEnd() { console.error("DIAG phase=run-end"); }
}
