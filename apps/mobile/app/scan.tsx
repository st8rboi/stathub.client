import { CameraView, useCameraPermissions } from 'expo-camera'
import { useRouter } from 'expo-router'
import { useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

import { extractUuid } from '../src/match/format'
import { colors, fontSize, spacing } from '../src/theme'
import { Button } from '../src/ui/Button'
import { Screen } from '../src/ui/Screen'

/**
 * Сканирование QR-кода матча. В QR достаточно GUID матча
 * (или ссылки вида stathub://match/<guid>) — код извлекается регуляркой.
 */
export default function ScanScreen() {
  const router = useRouter()
  const [permission, requestPermission] = useCameraPermissions()
  const [error, setError] = useState<string | null>(null)
  const lockedRef = useRef(false)

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  if (!permission.granted) {
    return (
      <Screen>
        <Text style={styles.text}>Чтобы прочитать QR-код матча, приложению нужен доступ к камере.</Text>
        <Button title="Разрешить доступ к камере" onPress={() => void requestPermission()} />
        <Button title="Ввести код вручную" variant="secondary" onPress={() => router.replace('/connect')} />
      </Screen>
    )
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => {
          if (lockedRef.current) return

          const uuid = extractUuid(data)
          if (!uuid) {
            setError('В этом QR-коде нет кода матча. Введите код вручную.')
            return
          }

          lockedRef.current = true
          router.replace(`/match/${uuid}`)
        }}
      />

      <View style={styles.overlay} pointerEvents="none">
        <Text style={styles.hint}>Наведите камеру на QR-код матча</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.bottom}>
        <Button title="Ввести код вручную" variant="secondary" onPress={() => router.replace('/connect')} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  text: {
    fontSize: fontSize.body,
    lineHeight: 22,
    color: colors.text,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: spacing(5),
    gap: spacing(2),
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  hint: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  error: {
    fontSize: fontSize.caption,
    color: '#FFD5D5',
    textAlign: 'center',
  },
  bottom: {
    position: 'absolute',
    left: spacing(4),
    right: spacing(4),
    bottom: spacing(8),
  },
})
