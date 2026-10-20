import {useState} from "react"
import {KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View} from "react-native"

import {getData} from "../data/DataProvider"
import {mainTheme} from "../layout/GlobalTheme"
import {DEFAULT_FILTER, GENRES} from "../data/Settings"
import {showToast} from "../components/Toast"

export default function Settings({navigation}) {
    const {filter, setFilter, setSearch, loggedIn, loading} = getData()

    const [filterSettings, setFilterSettings] = useState({
        ...filter,
        minRating: filter.minRating == null ? null : filter.minRating / 10,
        maxRating: filter.maxRating == null ? null : filter.maxRating / 10
    })

    function applyFilters() {
        if (!loggedIn || loading) return

        const minRating = filterSettings.minRating === null || String(filterSettings.minRating).trim() === ""
            ? null : Number(String(filterSettings.minRating).replace(",", "."))

        const maxRating = filterSettings.maxRating === null || String(filterSettings.maxRating).trim() === ""
            ? null : Number(String(filterSettings.maxRating).replace(",", "."))

        const minYear = filterSettings.minYear === null || String(filterSettings.minYear).trim() === ""
            ? null : Number(String(filterSettings.minYear).replace(",", "."))

        const maxYear = filterSettings.maxYear === null || String(filterSettings.maxYear).trim() === ""
            ? null : Number(String(filterSettings.maxYear).replace(",", "."))


        // Inputs use IMDb's 0–10 scale; the API expects scores out of 100.
        if (
            (minRating !== null && (!Number.isFinite(minRating) || minRating < 0 || minRating > 10 ||
                !Number.isInteger(minRating * 10))) ||
            (maxRating !== null && (!Number.isFinite(maxRating) || maxRating < 0 || maxRating > 10 ||
                !Number.isInteger(maxRating * 10)))
        ) {
            showToast("IMDb rating must be between 0 and 10, with at most one decimal.", true)
            return
        }

        if (minRating !== null && maxRating !== null && minRating > maxRating) {
            showToast("Minimum rating cannot exceed maximum rating.", true)
            return
        }


        // Validate years.
        if (
            (minYear !== null && (!Number.isInteger(minYear) || minYear < 1 || minYear > 9999)) ||
            (maxYear !== null && (!Number.isInteger(maxYear) || maxYear < 1 || maxYear > 9999))
        ) {
            showToast("Year must be a whole number between 1 and 9999.", true)
            return
        }

        if (minYear !== null && maxYear !== null && minYear > maxYear) {
            showToast("Minimum year cannot exceed maximum year.", true)
            return
        }


        setFilter({
            ...filterSettings,
            minRating: minRating === null ? null : minRating * 10,
            maxRating: maxRating === null ? null : maxRating * 10,
            minYear,
            maxYear
        })

        setSearch(filterSettings.movieName)
        navigation.goBack()
    }


    return (
        <KeyboardAvoidingView
            style={styles.screen}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >

                <Text style={styles.title}>Filter settings</Text>

                { /* Genres */ }
                <View style={styles.card}>
                    <Text style={styles.heading}>Genres</Text>
                    <Text style={styles.hint}>
                        Select which genres you want to include.
                    </Text>

                    <View style={styles.choices}>
                        {GENRES.map(([id, name]) => (
                            <Pressable
                                key={id}
                                accessibilityRole="button"
                                accessibilityState={{selected: filterSettings.genres.includes(id)}}
                                style={[
                                    styles.choice,
                                    filterSettings.genres.includes(id) && styles.selected
                                ]}
                                onPress={() => {
                                    const selected = filterSettings.genres.includes(id)

                                    const updatedGenres = selected
                                        ? filterSettings.genres.filter(genreId => genreId !== id)
                                        : [...filterSettings.genres, id]

                                    setFilterSettings({...filterSettings, genres: updatedGenres})
                                }}
                            >
                                <Text style={[
                                    styles.text,
                                    filterSettings.genres.includes(id) && styles.selectedText
                                ]}>
                                    {name}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </View>


                {/* IMDb rating */}
                <View style={styles.card}>
                    <Text style={styles.heading}>IMDb rating (0–10)</Text>

                    <View style={styles.row}>
                        <TextInput
                            accessibilityLabel="Minimum rating"
                            style={styles.input}
                            placeholder="Minimum"
                            placeholderTextColor={mainTheme.muted}
                            keyboardType="decimal-pad"
                            value={String(filterSettings.minRating ?? "")}
                            onChangeText={value => {
                                setFilterSettings({...filterSettings, minRating: value})
                            }}
                        />

                        <TextInput
                            accessibilityLabel="Maximum rating"
                            style={styles.input}
                            placeholder="Maximum"
                            placeholderTextColor={mainTheme.muted}
                            keyboardType="decimal-pad"
                            value={String(filterSettings.maxRating ?? "")}
                            onChangeText={value => {
                                setFilterSettings({...filterSettings, maxRating: value})
                            }}
                        />
                    </View>

                    <Text style={styles.hint}>Leave blank for no limit.</Text>
                </View>


                {/* Release year */}
                <View style={styles.card}>
                    <Text style={styles.heading}>Release year</Text>

                    <View style={styles.row}>
                        <TextInput
                            accessibilityLabel="Minimum year"
                            style={styles.input}
                            placeholder="Minimum"
                            placeholderTextColor={mainTheme.muted}
                            keyboardType="number-pad"
                            value={String(filterSettings.minYear ?? "")}
                            onChangeText={value => {
                                setFilterSettings({...filterSettings, minYear: value})
                            }}
                        />

                        <TextInput
                            accessibilityLabel="Maximum year"
                            style={styles.input}
                            placeholder="Maximum"
                            placeholderTextColor={mainTheme.muted}
                            keyboardType="number-pad"
                            value={String(filterSettings.maxYear ?? "")}
                            onChangeText={value => {
                                setFilterSettings({...filterSettings, maxYear: value})
                            }}
                        />
                    </View>

                    <Text style={styles.hint}>Leave blank for no limit.</Text>
                </View>


                {/* Liked and disliked movies */}
                <View style={styles.card}>
                    <Text style={styles.heading}>Your movies</Text>

                    <View style={styles.row}>
                        <Text style={styles.text}>Liked</Text>

                        <Switch
                            accessibilityLabel="Filter by liked"
                            value={filterSettings.showLiked}
                            disabled={!loggedIn}
                            trackColor={{true: mainTheme.accent}}
                            onValueChange={value => {
                                setFilterSettings({...filterSettings, showLiked: value})
                            }}
                        />
                    </View>

                    <View style={styles.row}>
                        <Text style={styles.text}>Disliked</Text>

                        <Switch
                            accessibilityLabel="Filter by disliked"
                            value={filterSettings.showDisliked}
                            disabled={!loggedIn}
                            trackColor={{true: mainTheme.accent}}
                            onValueChange={value => {
                                setFilterSettings({...filterSettings, showDisliked: value})
                            }}
                        />
                    </View>
                </View>


                {/* Sorting */}
                <View style={styles.card}>
                    <Text style={styles.heading}>Sort by</Text>

                    <View style={styles.choices}>
                        {[
                            ["RANDOM", "Shuffle"],
                            ["YEAR", "Release year"],
                            ["IMDB_RATING", "IMDb rating"],
                            ["TITLE", "Title"]
                        ].map(([value, label]) => (
                            <Pressable
                                key={value}
                                accessibilityRole="button"
                                accessibilityState={{selected: filterSettings.sortBy === value}}
                                style={[
                                    styles.choice,
                                    filterSettings.sortBy === value && styles.selected
                                ]}
                                onPress={() => {
                                    setFilterSettings({...filterSettings, sortBy: value})
                                }}
                            >
                                <Text style={[
                                    styles.text,
                                    filterSettings.sortBy === value && styles.selectedText
                                ]}>
                                    {label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    <View style={styles.row}>
                        <Text style={styles.text}>Descending order</Text>

                        <Switch
                            accessibilityLabel="Descending order"
                            value={filterSettings.descending}
                            disabled={filterSettings.sortBy === "RANDOM"}
                            trackColor={{true: mainTheme.accent}}
                            onValueChange={value => {
                                setFilterSettings({...filterSettings, descending: value})
                            }}
                        />
                    </View>
                </View>


                {/* Apply filters */}
                <Pressable
                    accessibilityRole="button"
                    onPress={applyFilters}
                    disabled={!loggedIn || loading}
                    style={[
                        styles.button,
                        (!loggedIn || loading) && styles.disabled
                    ]}
                >
                    <Text style={styles.selectedText}>Apply filters</Text>
                </Pressable>


                {/* Reset filters */}
                <Pressable
                    accessibilityRole="button"
                    style={styles.button}
                    onPress={() => {
                        setFilterSettings({...DEFAULT_FILTER, genres: []})
                    }}
                >
                    <Text style={styles.selectedText}>Reset to defaults</Text>
                </Pressable>

            </ScrollView>
        </KeyboardAvoidingView>
    )
}


const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: mainTheme.background
    },
    content: {
        padding: 20,
        gap: 16,
        width: "100%",
        maxWidth: 680,
        alignSelf: "center"
    },
    title: {
        color: mainTheme.text,
        fontSize: 28,
        fontWeight: "700"
    },
    card: {
        backgroundColor: mainTheme.surface,
        borderRadius: 16,
        padding: 16,
        gap: 12
    },
    heading: {
        color: mainTheme.text,
        fontSize: 18,
        fontWeight: "600"
    },
    text: {
        color: mainTheme.text,
        fontSize: 14
    },
    hint: {
        color: mainTheme.muted,
        fontSize: 13
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12
    },
    choices: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8
    },
    choice: {
        borderWidth: 1,
        borderColor: mainTheme.accent,
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 12
    },
    selected: {
        backgroundColor: mainTheme.accent
    },
    selectedText: {
        color: mainTheme.background,
        fontWeight: "600"
    },
    input: {
        flex: 1,
        backgroundColor: mainTheme.background,
        color: mainTheme.text,
        borderRadius: 10,
        padding: 14
    },
    button: {
        backgroundColor: mainTheme.accent,
        borderRadius: 12,
        padding: 16,
        alignItems: "center"
    },
    disabled: {
        opacity: 0.45
    }
})
