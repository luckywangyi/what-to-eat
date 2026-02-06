import React, {useEffect, useState} from 'react';
import {StatusBar, View, ActivityIndicator, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {
  PaperProvider,
  MD3LightTheme,
  Text,
  adaptNavigationTheme,
} from 'react-native-paper';
import {DefaultTheme} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {HomeScreen} from './screens/HomeScreen';
import {MenuScreen} from './screens/MenuScreen';
import {BudgetScreen} from './screens/BudgetScreen';
import {SettingsScreen} from './screens/SettingsScreen';
import {initDatabase} from './services/dbService';

const Tab = createBottomTabNavigator();

// 自定义主题
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2196F3',
    primaryContainer: '#BBDEFB',
    secondary: '#FF9800',
    secondaryContainer: '#FFE0B2',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    error: '#F44336',
  },
};

const {LightTheme} = adaptNavigationTheme({reactNavigationLight: DefaultTheme});

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: theme.colors.primary,
    background: theme.colors.background,
  },
};

function App(): React.JSX.Element {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      await initDatabase();
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize database:', error);
      setInitError('数据库初始化失败');
    }
  };

  if (!isInitialized) {
    return (
      <PaperProvider theme={theme}>
        <View style={styles.loadingContainer}>
          {initError ? (
            <Text style={styles.errorText}>{initError}</Text>
          ) : (
            <>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>正在初始化...</Text>
            </>
          )}
        </View>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer theme={navigationTheme}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <Tab.Navigator
          screenOptions={({route}) => ({
            tabBarIcon: ({focused, color, size}) => {
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

              return <Icon name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: '#888',
            headerStyle: {
              backgroundColor: '#FFFFFF',
            },
            headerTitleStyle: {
              fontWeight: '600',
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
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
  },
});

export default App;
