import {useEffect, useRef} from "react"
import {Animated, View} from "react-native"
import LottieView from "lottie-react-native"
import {mainTheme} from "../layout/GlobalTheme"

export default function LoadingScreen() {
    const textOpacity = useRef(new Animated.Value(0)).current

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(textOpacity, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(textOpacity, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        )

        animation.start()

        return () => animation.stop()
    }, [])

    return (
        <View style={{
                    backgroundColor: mainTheme.background,
                    width: "100%",
                    height: "100%",
                    alignItems: "center",
                    justifyContent: "center",
                }}>
            <LottieView
                source={require("../assets/loading.json")}
                autoPlay
                loop
                style={{
                    width: 250,
                    height: 250,
                }}/>
            <Animated.Text style={{ opacity: textOpacity, fontSize: 18, color: "white" }}>
                Loading...
            </Animated.Text>
        </View>
    )
}