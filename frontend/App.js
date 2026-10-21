import {StatusBar} from "expo-status-bar"
import {NavigationBar} from "expo-navigation-bar"
import {StyleSheet} from "react-native"
import {NavigationContainer} from "@react-navigation/native"
import {createNativeStackNavigator} from '@react-navigation/native-stack'
import Header from './components/Header'
import Home from './screens/Home'
import SettingsScreen from './screens/SettingsScreen'
import {mainTheme} from './layout/GlobalTheme'
import {DataProvider} from "./data/DataProvider"
import Toast from "./components/Toast"

const Stack = createNativeStackNavigator()

export default function App() {


    return (
        <>
            <StatusBar style="light"/>
            <NavigationBar hidden/>
            <NavigationContainer>
                <DataProvider>
                    <Stack.Navigator id={"1"} screenOptions={{
                        header: (navProps) => <Header {...navProps} styles={styles.header}/>,
                        contentStyle: styles.body
                    }}>
                        <Stack.Screen navigationKey={"1"} name={"Home"} component={Home}/>
                        <Stack.Screen navigationKey={"2"} name={"Settings"} component={SettingsScreen}/>
                    </Stack.Navigator>
                </DataProvider>
            </NavigationContainer>
            <Toast/>
        </>
    )
}

const styles = StyleSheet.create({
    header: {
        height: 80,
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        paddingBottom: 10,
        paddingHorizontal: 12,
        backgroundColor: mainTheme.surface
    },
    body: {
        backgroundColor: mainTheme.background
    }
})
