const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins')

/**
 * Разрешает http:// в release-сборке, только если задан STATHUB_ALLOW_HTTP=1 (профиль preview в eas.json):
 * тестовому APK нужен API в локальной сети. В production переменной нет, там работает только HTTPS.
 */
module.exports = function withCleartextTraffic(config) {
  if (process.env.STATHUB_ALLOW_HTTP !== '1') return config

  return withAndroidManifest(config, (next) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(next.modResults)
    application.$['android:usesCleartextTraffic'] = 'true'
    return next
  })
}
