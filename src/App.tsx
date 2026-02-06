import React, {useEffect, useState, useMemo} from 'react';
import {StatusBar, View, ActivityIndicator, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {
  PaperProvider,
  MD3LightTheme,
  Text,
} from 'react-native-paper';
import {DefaultTheme} from '@react-navigation/native';

import {HomeScreen} from './screens/HomeScreen';
import {MenuScreen} from './screens/MenuScreen';
import {BudgetScreen} from './screens/BudgetScreen';
import {SettingsScreen} from './screens/SettingsScreen';
import {AnimatedTabIcon} from './components/AnimatedTabIcon';
import {initDatabase} from './services/dbService';
import {useThemeStore} from './stores/themeStore';
import {ThemeProvider} from './context/ThemeContext';
import {themes} from './theme';

const Tab = createBottomTabNavigator();

function App(): React.JSX.Element {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const {currentTheme, loadTheme, isLoaded: themeLoaded} = useThemeStore();

  // 获取当前主题颜色
  const colors = useMemo(() => themes[currentTheme].colors, [currentTheme]);

  // 动态生成 Paper 主题
  const paperTheme = useMemo(() => ({
    ...MD3LightTheme,
    colors: {
      ...MD3LightTheme.colors,
      primary: colors.accent,
      primaryContainer: colors.accentSubtle,
      secondary: colors.warning,
      secondaryContainer: colors.warningSubtle,
      background: colors.background,
      surface: colors.surface,
      surfaceVariant: colors.surfaceSecondary,
      onSurface: colors.text.primary,
      onSurfaceVariant: colors.text.secondary,
      outline: colors.border,
      error: colors.error,
    },
    roundness: 12,
  }), [colors]);

  // 动态生成导航主题
  const navigationTheme = useMemo(() => ({
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: colors.accent,
      background: colors.background,
      card: colors.surface,
      text: colors.text.primary,
      border: colors.border,
    },
  }), [colors]);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      await loadTheme();
      await initDatabase();
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize database:', error);
      setInitError('数据库初始化失败');
    }
  };

  if (!isInitialized) {
    return (
      <PaperProvider theme={paperTheme}>
        <View style={[styles.loadingContainer, {backgroundColor: colors.background}]}>
          {initError ? (
            <Text style={[styles.errorText, {color: colors.error}]}>{initError}</Text>
          ) : (
            <>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={[styles.loadingText, {color: colors.text.secondary}]}>正在初始化...</Text>
            </>
          )}
        </View>
      </PaperProvider>
    );
  }

  return (
    <ThemeProvider>
      <PaperProvider theme={paperTheme}>
        <View style={{flex: 1, backgroundColor: colors.background}}>
          <NavigationContainer theme={navigationTheme}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
          <Tab.Navigator
            screenOptions={({route}) => ({
              animation: 'fade',
              sceneStyle: {
                backgroundColor: colors.background,
              },
              tabBarIcon: ({focused, color}) => {
                let iconName: string;

                switch (route.name) {
                  case 'Home':
                    iconName = focused ? 'food' : 'food-outline';
                    break;
                  case 'Menu':
                    iconName = focused ? 'silverware-fork-knife' : 'silverware-fork-knife';
                    break;
                  case 'Budget':
                    iconName = focused ? 'wallet' : 'wallet-outline';
                    break;
                  case 'Settings':
                    iconName = focused ? 'cog' : 'cog-outline';
                    break;
                  default:
                    iconName = 'circle';
                }

                return <AnimatedTabIcon name={iconName} size={24} color={color} focused={focused} />;
              },
              tabBarActiveTintColor: colors.accent,
              tabBarInactiveTintColor: colors.text.tertiary,
              tabBarStyle: {
                backgroundColor: colors.surface,
                borderTopWidth: 0.5,
                borderTopColor: colors.border,
                paddingTop: 8,
                paddingBottom: 28,
                height: 84,
              },
              tabBarLabelStyle: {
                fontSize: 10,
                fontWeight: '500',
                marginTop: 4,
              },
              headerStyle: {
                backgroundColor: colors.surface,
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: 0.5,
                borderBottomColor: colors.border,
              },
              headerTitleStyle: {
                fontSize: 17,
                fontWeight: '600',
                color: colors.text.primary,
              },
            })}
          >
            <Tab.Screen
              name="Home"
              component={HomeScreen}
              options={{
                tabBarLabel: '今日推荐',
                headerTitle: '今日吃什么',
              }}
            />
            <Tab.Screen
              name="Menu"
              component={MenuScreen}
              options={{
                tabBarLabel: '菜单管理',
                headerTitle: '食堂菜单',
              }}
            />
            <Tab.Screen
              name="Budget"
              component={BudgetScreen}
              options={{
                tabBarLabel: '预算统计',
                headerTitle: '预算管理',
              }}
            />
            <Tab.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                tabBarLabel: '设置',
                headerTitle: '设置',
              }}
            />
          </Tab.Navigator>
          </NavigationContainer>
        </View>
      </PaperProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '400',
  },
  errorText: {
    fontSize: 15,
    fontWeight: '500',
  },
});

export default App;
