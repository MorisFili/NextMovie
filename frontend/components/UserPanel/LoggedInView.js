import {Pressable, StyleSheet, Text, View} from "react-native"
import {mainTheme} from "../../layout/GlobalTheme"
import {getData} from "../../data/DataProvider"
import {useNavigation} from "@react-navigation/native"

export default function LoggedInView({signOut, processingInteraction, close}) {
    const {setFilter, loading} = getData()
    const navigation = useNavigation()

    return (
        <View style={{width: "100%", padding: 20, gap: 14}}>
            <Pressable accessibilityRole="button" key={"Home"} style={styles.button} disabled={loading || processingInteraction}
                       onPress={() => {setFilter(prev => ({...prev, showLiked: false, showDisliked: false}))
                        close()}}>
                <Text style={styles.icon}>{"⌂"}</Text>
                <Text style={styles.text}>{"Home"}</Text>
                <Text style={{color: mainTheme.accent, fontSize: 24}}>›</Text>
            </Pressable>
            <Pressable accessibilityRole="button" key={"Liked"} style={styles.button} disabled={loading || processingInteraction}
                       onPress={() => {setFilter(prev => ({...prev, showLiked: true, showDisliked: false}))
                        close()}}>
                <Text style={styles.icon}>{"👍"}</Text>
                <Text style={styles.text}>{"Liked movies"}</Text>
                <Text style={{color: mainTheme.accent, fontSize: 24}}>›</Text>
            </Pressable>
            <Pressable accessibilityRole="button" key={"Disliked"} style={styles.button} disabled={loading || processingInteraction}
                       onPress={() => {setFilter(prev => ({...prev, showLiked: false, showDisliked: true}))
                        close()}}>
                <Text style={styles.icon}>{"👎"}</Text>
                <Text style={styles.text}>{"Disliked movies"}</Text>
                <Text style={{color: mainTheme.accent, fontSize: 24}}>›</Text>
            </Pressable>
            <Pressable accessibilityRole="button" key={"Settings"} style={styles.button} disabled={loading || processingInteraction}
                       onPress={() => {close()
                        navigation.navigate("Settings")}}>
                <Text style={styles.icon}>{"⚙"}</Text>
                <Text style={styles.text}>{"Settings"}</Text>
                <Text style={{color: mainTheme.accent, fontSize: 24}}>›</Text>
            </Pressable>
            <Pressable
                accessibilityRole="button"
                style={({pressed}) => [styles.signOut, pressed && styles.pressed, processingInteraction && {opacity: 0.4}]}
                disabled={processingInteraction} onPress={signOut}>
                <Text style={{color: "#D9958D", fontSize: 15, fontWeight: "600"}}>Sign out</Text>
            </Pressable>
        </View>
    )
}

const styles = StyleSheet.create({
    button: {
        height: 48,
        borderWidth: 1,
        borderColor: "#3E3830",
        borderLeftWidth: 3,
        borderLeftColor: mainTheme.accent,
        backgroundColor: mainTheme.surface,
        borderRadius: 12,
        paddingHorizontal: 14,
        flexDirection: "row",
        gap: 12,
        alignItems: "center"
    },
    icon: {
        color: mainTheme.accent,
        fontSize: 20,
        width: 26,
        textAlign: "center"
    },
    text: {
        flex: 1,
        color: mainTheme.text,
        fontSize: 16,
        fontWeight: "600"
    },
    signOut: {
        height: 48,
        marginTop: 8,
        borderWidth: 1,
        borderColor: "#69433F",
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center"
    },
    pressed: {
        backgroundColor: "#383127",
        transform: [{scale: 0.98}]
    }
})
