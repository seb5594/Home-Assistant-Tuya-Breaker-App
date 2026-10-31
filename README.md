<!-- header:begin (generated from project metadata) -->
<h1 align="center">Tuya Breaker</h1>

<p align="center">
  <img src="https://raw.githubusercontent.com/seb5594/Home-Assistant-Tuya-Breaker-App/dev/tuya_breaker/logo.png" alt="Tuya Breaker" width="360" height="129">
</p>

---

<p align="center">
  <a href="https://paypal.me/seb5594"><img src="https://img.shields.io/static/v1?label=Support&amp;message=PayPal&amp;color=0070BA&amp;logo=paypal&amp;logoColor=white&amp;style=for-the-badge" alt="PayPal" height="40"></a>
  <a href="https://buymeacoffee.com/seb5594"><img src="https://img.shields.io/static/v1?label=Support&amp;message=Buy%20Me%20a%20Coffee&amp;color=FFDD00&amp;logo=buy-me-a-coffee&amp;logoColor=black&amp;style=for-the-badge" alt="Buy Me a Coffee" height="40"></a><br>
  <a href="https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fseb5594%2FHome-Assistant-Apps"><img src="https://img.shields.io/static/v1?label=Home%20Assistant&amp;message=Add%20app%20repository&amp;color=18BCF2&amp;logo=homeassistant&amp;logoColor=white&amp;style=for-the-badge" alt="Home Assistant" height="28"></a>
  <a href="https://github.com/seb5594/Home-Assistant-Tuya-Breaker-App/releases"><img src="https://img.shields.io/static/v1?label=version&amp;message=Beta%203&amp;color=1877A5&amp;style=for-the-badge" alt="version" height="28"></a>
  <img src="https://img.shields.io/static/v1?label=image%20pulls&amp;message=4&amp;color=1877A5&amp;style=for-the-badge" alt="image pulls" height="28"><br>
  <img src="https://img.shields.io/static/v1?label=arch%20%26%20size&amp;message=amd64%20200.2%20%C2%B7%20aarch64%20219.4%20MiB&amp;color=157F71&amp;style=flat" alt="arch &amp; size" height="20">
  <img src="https://img.shields.io/static/v1?label=stage&amp;message=experimental&amp;color=2F855A&amp;style=flat" alt="stage" height="20">
  <img src="https://img.shields.io/static/v1?label=ingress&amp;message=enabled&amp;color=7C3AED&amp;style=flat" alt="ingress" height="20">
  <img src="https://img.shields.io/static/v1?label=mounts%20%28read-write%29&amp;message=share&amp;color=B45309&amp;style=flat" alt="mounts (read-write)" height="20">
  <img src="https://img.shields.io/static/v1?label=privileged&amp;message=NET_ADMIN%2C%20NET_RAW&amp;color=B45309&amp;style=flat" alt="privileged" height="20"><br>
  <a href="https://github.com/seb5594/Home-Assistant-Apps/stargazers"><img src="https://img.shields.io/github/stars/seb5594/Home-Assistant-Tuya-Breaker-App?label=stars&amp;style=flat" alt="stars" height="20"></a>
  <a href="https://github.com/seb5594/Home-Assistant-Apps/issues"><img src="https://img.shields.io/github/issues/seb5594/Home-Assistant-Tuya-Breaker-App?label=issues&amp;style=flat" alt="issues" height="20"></a>
  <img src="https://img.shields.io/static/v1?label=runtime%20tests&amp;message=9%20passed&amp;color=2F855A&amp;style=flat" alt="runtime tests" height="20">
  <a href="https://github.com/seb5594/Home-Assistant-Tuya-Breaker-App/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/seb5594/Home-Assistant-Tuya-Breaker-App/ci.yml?branch=dev&amp;label=checks&amp;style=flat" alt="checks" height="20"></a>
  <a href="https://github.com/seb5594/Home-Assistant-Apps#license"><img src="https://img.shields.io/github/license/seb5594/Home-Assistant-Tuya-Breaker-App?label=license&amp;style=flat" alt="license" height="20"></a>
</p>
<!-- header:end -->

**English** · [Deutsch](README.de.md)

Tuya Breaker combines **UnTuyaOS3 → Lightleak → Tuya-Cloudcutter** in one experimental Home Assistant Ingress workspace. It has its own release cycle and uses the independent [WiFi App Helper](https://github.com/seb5594/Home-Assistant-WiFi-Helper-App) to borrow one isolated radio. The [standalone UnTuyaOS3 app](https://github.com/seb5594/Home-Assistant-UnTuyaOS3-App) remains available separately.

> **This tool can permanently brick devices. Use at your own risk and accept responsibility for your hardware. Neither a completed transfer nor a valid dump guarantees that a device boots. Lightleak setup itself changes flash; its dumps are private post-exploit snapshots. The native Lightleak controller and Linux AP mode still need physical-device validation.**

Install Tuya Breaker and WiFi App Helper from the [Home Assistant Apps catalog](https://github.com/seb5594/Home-Assistant-Apps), configure the same private pairing secret and keep Protection mode/AppArmor on. All user interaction uses the app Configuration and Ingress Web UI; no host terminal is needed.

[Full setup and usage guide](tuya_breaker/DOCS.md) · [Changelog](tuya_breaker/CHANGELOG.md) · [WiFi Helper migration](https://github.com/seb5594/Home-Assistant-WiFi-Helper-App/blob/dev/README.md#migration-from-anti-tuya-wifi-helper)

## Tools

| Tool | Purpose and boundary |
| --- | --- |
| UnTuyaOS3 | Established interactive platform/firmware workflow for affected devices. |
| Lightleak | Generic BK7231T/N variants, stager/payload setup and complete private 2 MiB flash readout; no automatic replacement-firmware flash. |
| Tuya-Cloudcutter | Exact original device/firmware profile required; Flash or Detach with an explicit reviewed configuration. |

Only one tool and radio lease can run at a time. Tool/adapter selection stays locked until worker shutdown, cleanup and host restoration complete. The main app has no host network, host D-Bus, Docker API or SYS_ADMIN access.

## Community hardware references

The searchable OpenBeken hardware explorer reads the [official device database](https://openbekeniot.github.io/webapp/devicesList.html) programmatically, caches references and links to sources. Thanks to **OpenBeken / openshwprojects**, the **Elektroda teardown community** and **tuya-cloudcutter**. A hardware record does not prove exploit compatibility and never automatically approves a profile.

## Development

Each checkout builds independently. `project.json` defines this app's version and build pins. `vendor/wifi_helper/UPSTREAM.json` records the helper SDK revision and checksums; `vendor/untuyaos3/UPSTREAM.json` records the reviewed base snapshot. Generated build-context copies are checked by CI; no sibling app repository or floating runtime download is required. Uses the official Home Assistant Python 3.13 base and hass-workflows for both architectures.

Credit for the exploits and payloads belongs to tuya-cloudcutter and Kuba Szczodrzyński. The pinned CloudCutter fork supplies Python 3.13 binary TLS-PSK compatibility. [Original UnTuyaOS3](https://github.com/tuya-cloudcutter/UnTuyaOS3) · [Original CloudCutter](https://github.com/tuya-cloudcutter/tuya-cloudcutter) · [Lightleak fork](https://github.com/seb5594/lightleak).

<!-- support:begin (generated, shared text) -->
## Say thanks

All my projects are built in my spare time, just for the fun of it. Still, they take a lot of time and care, and many of the smart home gadgets I buy end up here because I want to make them cloud-free and smart-home ready. Every bit of support means a lot to me.

If my work helped you or turned out to be useful, show your appreciation with a hot drink for my next sleepless night.

[![PayPal](https://img.shields.io/static/v1?label=Support&message=PayPal&color=0070BA&logo=paypal&logoColor=white&style=for-the-badge)](https://paypal.me/seb5594) [![Buy Me a Coffee](https://img.shields.io/static/v1?label=Support&message=Buy%20Me%20a%20Coffee&color=FFDD00&logo=buy-me-a-coffee&logoColor=black&style=for-the-badge)](https://buymeacoffee.com/seb5594)
<!-- support:end -->

<!-- license:begin (generated from the license file) -->
## License

[![license](https://img.shields.io/static/v1?label=license&message=MIT&color=5B6770&style=flat)](LICENSE)

Published under the [MIT License](LICENSE).
<!-- license:end -->
