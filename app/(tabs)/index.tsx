import React from 'react'
import { Surface } from 'react-native-paper'

import { Locales, ScreenInfo, styles } from '@/lib'
import StartGame from '@/lib/ui/components/StartGame'

const TabsHome = () => (
  <Surface style={styles.screen}>
    <StartGame
    />
    <ScreenInfo title={Locales.t('titleHome')} path="app/(tabs)/index.tsx" />
  </Surface>
)

export default TabsHome
