# Tuya Breaker

[English](README.md) · **Deutsch**

Eine experimentelle Home-Assistant-WebUI für **UnTuyaOS3 → Lightleak → Tuya-Cloudcutter**, mit eigenständiger Versionierung und dem separat installierbaren [WiFi App Helper](https://github.com/seb5594/Home-Assistant-WiFi-Helper-App).

**Brickgefahr: Die Nutzung erfolgt auf eigene Verantwortung.** Eine abgeschlossene Übertragung garantiert keinen startfähigen Zustand. Lightleak verändert bereits beim Einrichten den Flash-Speicher; seine Dumps enthalten Geheimnisse und sind keine unveränderten Backups. Der native Lightleak-Controller und der Linux-AP-Modus sind noch nicht an echter Zielhardware validiert.

Beide Apps aus dem [Hauptkatalog](https://github.com/seb5594/Home-Assistant-Apps) installieren, dasselbe private Kopplungsgeheimnis konfigurieren und zuerst den Helper starten. Protection mode und AppArmor eingeschaltet lassen. Adapter, Werkzeug, Profil und Firmware über die Oberfläche auswählen; Hinweise im Live-Terminal befolgen. Keine Host-Befehle nötig.

Vor dem Wechsel vom alten Anti-Tuya-Helper alle Sitzungen vollständig beenden und die erfolgreiche Wiederherstellung prüfen. Dann die [deutsche Anleitung des neuen Helpers](https://github.com/seb5594/Home-Assistant-WiFi-Helper-App/blob/dev/README.de.md) befolgen. Der installierte Tuya-Breaker-Slug bleibt `tuya_breaker`, der neue Helper heißt technisch `wifi_helper`.

Die CloudCutter-Auswahl benötigt ein genau passendes Geräte-/Firmwareprofil. Ein ähnliches Modell oder ein OpenBeken-Hardwareeintrag reicht nicht als Kompatibilitätsnachweis. Änderungen bleiben bis zur vollständigen Adapter-Rückgabe gesperrt. [Ausführliche englische Anleitung](tuya_breaker/DOCS.md).

Wenn Tuya Breaker direkt aus der früheren Sammel-Repository installiert wurde, ändert sich die Home-Assistant-Repository-Kennung beim Umzug. Daten werden nicht automatisch übertragen. Vor dem Entfernen der alten Installation per Home Assistant ein Backup erstellen, private CloudCutter-Zugangsdaten und vollständige Lightleak-Dumps über die alte WebUI herunterladen sowie Konfiguration, Kopplungsgeheimnis und Original-Firmwaredateien privat sichern. Die neue App zuerst im Hauptkatalog installieren und prüfen. Eine bestehende Installation aus dem Hauptkatalog behält ihren `tuya_breaker`-Slug.
