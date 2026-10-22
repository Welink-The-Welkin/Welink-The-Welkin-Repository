from pathlib import Path


ROOT = Path(__file__).parents[1]


def test_start_scripts_open_browser_and_use_manual_startup():
    powershell = (ROOT / "start.ps1").read_text(encoding="utf-8")

    assert "Start-Process" in powershell
    assert "8000..8010" in powershell
    assert "InstallAutostart" not in powershell
    assert "Start-Process $gameUrl" in powershell


def test_start_script_checks_health_marker_and_scans_alternate_ports():
    powershell = (ROOT / "start.ps1").read_text(encoding="utf-8")

    assert "TcpListener" in powershell
    assert "portProbe.Start()" in powershell
    assert "$health.data.status -eq \"ok\"" in powershell
    assert "$health.data.mode -in @(\"offline\", \"live\")" in powershell
    assert '$health.data.version -eq "0.2.0"' in powershell
    assert '"--port", "$gamePort"' in powershell
    assert "$server.HasExited" in powershell


def test_start_script_reuses_the_existing_wanderer_game_service():
    powershell = (ROOT / "start.ps1").read_text(encoding="utf-8")

    assert "/api/health" in powershell
    assert "游戏服务已在运行" in powershell


def test_start_script_warns_and_avoids_reusing_an_old_game_version():
    powershell = (ROOT / "start.ps1").read_text(encoding="utf-8")

    assert '$health.data.version -ne "0.2.0"' in powershell
    assert "检测到旧版游戏服务" in powershell
    assert "$health.data.version -eq \"0.2.0\"" in powershell


def test_batch_launcher_keeps_error_window_open_for_diagnostics():
    batch = (ROOT / "start.bat").read_text(encoding="utf-8")

    assert "if errorlevel 1" in batch
    assert "pause" in batch
    assert '"%~dp0start.ps1" %*' in batch


def test_readme_explains_automatic_alternate_port_selection():
    readme = (ROOT / "README.md").read_text(encoding="utf-8")

    assert "自动尝试 8001 至 8010" in readme
    assert "请关闭占用端口的程序再启动" not in readme
