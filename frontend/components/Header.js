import {Pressable, View, Text} from "react-native"
import {StyleSheet} from "react-native"
import {mainTheme} from "../layout/GlobalTheme"
import {UserPanel} from "./UserPanel/UserPanel"
import {getData} from "../data/DataProvider"

export default function Header({navigation, back, styles}) {

    const {loading} = getData()

    if (loading) return null

    return (
        <View style={styles}>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={() => navigation.goBack()}
                disabled={!back}
                style={{opacity: !back ? 0 : 1}}
            >
                <Text style={style.backButton}>←</Text>
            </Pressable>
            <Text style={style.logoPlaceholder}>NextMovie</Text>
            <UserPanel />
        </View>
    )
}

const style = StyleSheet.create({
    backButton: {
        fontSize: 30,
        fontWeight: "bold",
        color: mainTheme.text
    },
    logoPlaceholder: {
        color: mainTheme.text,
        fontWeight: "bold",
        fontSize: 20,
        fontStyle: "italic"
    }
})
