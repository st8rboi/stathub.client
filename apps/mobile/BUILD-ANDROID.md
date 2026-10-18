# Сборка судейского приложения под Android

Приложение — managed Expo (Expo SDK 57, `expo-router`), папки `android/` в репозитории нет.
Отсюда два рабочих маршрута: облачная сборка EAS и локальная через Gradle.

## Что важно до сборки

Судья подключается к серверу по адресу из экрана «Настройки», а не через dev-прокси.
Поэтому телефон и машина с API должны быть в одной сети, а API — слушать не только localhost:

```bash
dotnet run --project src/Stathub.WebApi --launch-profile http --urls "http://0.0.0.0:5248"
```

В приложении в «Настройках» указывается `http://<IP-машины>:5248` (например `http://192.168.1.50:5248`),
порт 5248 должен быть разрешён в брандмауэре Windows.

**Про HTTP в release-сборке:** Android 9+ по умолчанию блокирует `http://` (cleartext). Для проверки
на телефоне это не мешает (debug-сборка и Expo Go разрешают), но для боевого APK нужен либо HTTPS,
либо `expo-build-properties` с `android.usesCleartextTraffic: true`. Плагин не подключён —
скажите, если нужно, добавлю.

## Вариант A. EAS Build (облако, без Android SDK)

Нужен бесплатный аккаунт Expo. Первый раз:

```bash
cd stathub.client/apps/mobile
npm install -g eas-cli
eas login                 # логин/пароль expo.dev
eas init                  # привяжет проект, допишет expo.extra.eas.projectId в app.json
```

Дальше — сборка APK для установки на телефон:

```bash
eas build -p android --profile preview
```

EAS соберёт в облаке и даст ссылку на `.apk` (и QR). Скачать на телефон, разрешить установку
из неизвестных источников, установить. Для Google Play нужен `.aab`:

```bash
eas build -p android --profile production   # профиль из eas.json: buildType = app-bundle
```

Профили лежат в [eas.json](eas.json). Подпись EAS хранит у себя; при локальной сборке ключ
создаётся отдельно (см. ниже).

## Вариант B. Локальная сборка (нужны JDK 17 и Android SDK)

Сейчас на машине **нет** ни Java, ни Android SDK — их надо поставить (≈3 ГБ):

1. **JDK 17** — Temurin/Microsoft OpenJDK, задать `JAVA_HOME`.
2. **Android SDK** — командные инструменты (`cmdline-tools`), затем:
   ```bash
   sdkmanager --licenses
   sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"
   ```
   `ANDROID_HOME` должен указывать на папку SDK.

Дальше:

```bash
cd stathub.client/apps/mobile
npx expo prebuild -p android        # сгенерирует android/ (в git не нужен)
cd android
./gradlew assembleDebug             # APK: android/app/build/outputs/apk/debug/app-debug.apk
```

Для release-варианта нужен ключ подписи:

```bash
keytool -genkeypair -v -keystore stathub-release.keystore -alias stathub \
  -keyalg RSA -keysize 2048 -validity 10000
```

и прописать его в `android/app/build.gradle` (или собирать через `eas build --local`,
тогда подпись возьмётся из EAS-профиля).

Установка на подключённый телефон:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## Вариант C. Без сборки, для проверки логики

`pnpm dev:mobile` — Expo Go по QR-коду: камера и офлайн-очередь работают, APK не нужен.
Годится, чтобы проверить экраны до релиза, но не для судьи «в поле» (нужен установленный apk).

## Что уже готово в конфигурации

- `app.json`: имя «Stathub Судья», `android.package = com.stathub.referee`, `versionCode = 1`,
  разрешение камеры с русским пояснением.
- `eas.json`: профили `preview` (APK) и `production` (AAB).
- Скрипты в `package.json`: `android:apk`, `android:aab`, `android:prebuild`, `android:local`.
