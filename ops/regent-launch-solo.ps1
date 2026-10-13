param()
$Manifest = Join-Path $PSScriptRoot 'codex-ops\regent-native\manifest.json'
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$m = Get-Content -LiteralPath $Manifest -Raw | ConvertFrom-Json
$receipt = Join-Path (Split-Path -Parent $Manifest) 'native-launch.json'
function Write-Receipt($value) {
  $value | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $receipt -Encoding UTF8
}
if (Test-Path -LiteralPath $receipt) { exit 0 }
$result = @{status='preflight'; request_id=$m.request_id; client_id=$m.client_id; api_port=$m.api_port}
try {
  if ($m.request_id -ne 'roy-20261013-isolated-character-climb' -or $m.client_id -ne '2026101302' -or $m.api_port -ne 18181) {
    throw 'Unexpected fixed launch manifest.'
  }
  $old = Get-CimInstance Win32_Process -Filter 'ProcessId=34676'
  if (-not $old -or $old.Name -ne 'SlayTheSpire2.exe' -or $old.SessionId -ne 1 -or
      $old.CreationDate.ToUniversalTime().ToString('o') -ne $m.original_creation_time) {
    throw 'Original process identity changed.'
  }
  $oldHealth = Invoke-RestMethod 'http://127.0.0.1:8080/health' -TimeoutSec 5
  if (-not $oldHealth.ok -or $oldHealth.data.process_id -ne 34676) { throw 'Original health differs.' }
  $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback,18181)
  try { $listener.Start() } finally { $listener.Stop() }
  $clientRoot = Join-Path (Join-Path $env:APPDATA 'SlayTheSpire2\default') '2026101302'
  if (Test-Path -LiteralPath $clientRoot) { throw 'New client root already exists; inspect instead of overwriting.' }
  $game = Join-Path $m.native_directory 'SlayTheSpire2.exe'
  foreach ($relative in @('SlayTheSpire2.exe','data_sts2_windows_x86_64','mods\STS2AIAgent\STS2AIAgent.dll','mods\STS2AIAgent\STS2AIAgent.pck')) {
    if (-not (Test-Path -LiteralPath (Join-Path $m.native_directory $relative))) { throw 'Native link is unavailable.' }
  }
  # This is the official v0.16.2 launcher's fresh-client settings schema. No progression or run is seeded.
  New-Item -ItemType Directory -Path $clientRoot | Out-Null
  $settings = @{
    schema_version=8; mod_settings=@{mods_enabled=$true;mod_list=@(@{id='STS2AIAgent';is_enabled=$true;source='mods_directory'})}
    seen_ea_disclaimer=$true;skip_intro_logo=$true;fullscreen=$false;limit_fps_in_background=$true
    vsync='disabled';window_size=@{X=1280;Y=720};window_position=@{X=-1;Y=-1};language='en'
    aspect_ratio='sixteen_by_nine';fps_limit=30;msaa=2;resize_windows=$true;target_display=0
    volume_ambience=0.0;volume_bgm=0.0;volume_master=0.0;volume_sfx=0.0
    controller_mapping_type='default';controller_mapping=@{};keyboard_mapping=@{};keyboard_only_mapping=@{}
  }
  [System.IO.File]::WriteAllText((Join-Path $clientRoot 'settings.save'),($settings | ConvertTo-Json -Depth 8), (New-Object System.Text.UTF8Encoding $false))
  $result.status='launching';$result.client_root=$clientRoot;$result.game_settings=(Join-Path $clientRoot 'settings.save')
  $result.mod_settings=$m.mod_settings;$result.game_executable=$game
  Write-Receipt $result
  $si = New-Object System.Diagnostics.ProcessStartInfo
  $si.FileName=$game;$si.WorkingDirectory=$m.native_directory;$si.UseShellExecute=$false
  $si.Arguments='--windowed --force-steam off --clientId 2026101302 --log-file "' + $m.native_log + '"'
  $si.Environment['STS2_API_PORT']='18181';$si.Environment['STS2_API_ALLOW_FALLBACK']='0'
  $si.Environment['STS2_AGENT_SETTINGS_PATH']=$m.mod_settings;$si.Environment['STS2_AGENT_AUTOPLAY']='0'
  $si.Environment['STS2_AGENT_ROLE']='human';$si.Environment.Remove('STS2_ENABLE_DEBUG_ACTIONS')
  foreach ($name in @('STS2_MULTIPLAYER_HOST_IP','STS2_MULTIPLAYER_NET_ID','STS2_COMPANION_SESSION_TOKEN','STS2_COMPANION_HOST_PID')) {
    $si.Environment.Remove($name)
  }
  $new = [System.Diagnostics.Process]::Start($si)
  $result.status='started';$result.pid=$new.Id;$result.creation_time=$new.StartTime.ToUniversalTime().ToString('o')
  $result.desktop_session=$new.SessionId
  Write-Receipt $result
} catch {
  $result.status='failed';$result.error=$_.Exception.Message
  Write-Receipt $result
  exit 1
}
