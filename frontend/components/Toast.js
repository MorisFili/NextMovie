import {Text, StyleSheet} from "react-native"
import {useEffect, useState} from "react"
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from "react-native-reanimated"

let setToastRef

export function showToast(message, error = false) {
    if (setToastRef) {
        setToastRef({message: message, error: error})
    }
}

export default function Toast() {
    const [toast, setToast] = useState({message: "", error: false})
    const opacity = useSharedValue(0)

    useEffect(() => {
        setToastRef = setToast
        return () => {
            setToastRef = null
        }
    }, [])

    useEffect(() => {
        if (!toast.message) return

        opacity.value = withTiming(1, {duration: 200})

        const timeout = setTimeout(() => {
            opacity.value = withTiming(0, {duration: 200})
        }, 2000)

        return () => clearTimeout(timeout)
    }, [toast])

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value
    }))

    return (
        <Animated.View pointerEvents="none" style={[style.toast, toast.error && style.errorTheme, animatedStyle]}>
            <Text style={style.text}>{toast.message}</Text>
        </Animated.View>
    )
}

const style = StyleSheet.create({
    toast: {
        position: "absolute",
        bottom: 60,
        alignSelf: "center",
        backgroundColor: "darkslategray",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        zIndex: 1000
    },
    errorTheme: {
        backgroundColor: "#8B3030",
    },
    text: {
        color: "#fff",
        fontSize: 14
    }
})
