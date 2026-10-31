/** Required WAL-reset fixes; shared by the publisher and read-only gameplay connections. */
export function safeSQLiteVersion(version: string): boolean {
 const [major = 0, minor = 0, patch = 0] = version.split(".").map(Number);
 return major > 3 || major === 3 && (minor > 51 || minor === 51 && patch >= 3 || minor === 50 && patch >= 7 || minor === 44 && patch >= 6);
}
