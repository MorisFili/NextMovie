import {useState, useRef, useCallback} from 'react'
import {ActivityIndicator, FlatList, Keyboard, Text, TextInput, View} from "react-native"
import {GestureHandlerRootView} from "react-native-gesture-handler"
import MovieCard from "../components/MovieCard"
import ExpandedCard from "../components/ExpandedCard"
import LoadingScreen from "../components/LoadingScreen"
import {getData} from "../data/DataProvider"
import {mainTheme} from "../layout/GlobalTheme"

export default function Home() {
    const homeRef = useRef(null)
    const [selectedMovie, setSelectedMovie] = useState(null)

    const {loading, movieList, fetchMore, likedMovies, setPreference, search,
        setSearch, loadingMore, loggedIn} = getData()

    const handleMoviePress = useCallback((movie, layout) => {
        homeRef.current?.measureInWindow((x, y) => {
            setSelectedMovie({
                movie,
                layout: {
                    ...layout,
                    x: layout.x - x,
                    y: layout.y - y
                }
            });
        });
    }, []);

    if (loading) {
        return <LoadingScreen/>
    }

    return (
        <GestureHandlerRootView style={{flex: 1}}>
            <View ref={homeRef} style={{flex: 1}}>
                {loggedIn && <>
                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search movies..."
                        accessibilityLabel="Search movies"
                        placeholderTextColor={mainTheme.muted}
                        autoCorrect={false}
                        returnKeyType="search"
                        onSubmitEditing={Keyboard.dismiss}
                        style={{
                            margin: 10,
                            marginBottom: 0,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 10,
                            backgroundColor: mainTheme.surface,
                            color: mainTheme.text,
                            fontSize: 14
                        }}
                    />

                    <Text style={{color: mainTheme.muted, fontSize: 12, margin: 10, fontWeight: "bold"}}>
                        Explore movies. Hold a poster, then swipe right to like, left to dislike, or up to clear.
                    </Text>
                </>}

                <View style={{flex: 1}} onTouchStart={Keyboard.dismiss}>
                    <FlatList
                        initialNumToRender={12}
                        maxToRenderPerBatch={9}
                        windowSize={5}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                        numColumns={3}
                        columnWrapperStyle={{gap: 10}}
                        contentContainerStyle={{padding: 10, gap: 10}}
                        style={{flex: 1}}
                        data={movieList}
                        extraData={likedMovies}
                        onEndReached={movieList.length > 12 ? fetchMore : undefined}
                        onEndReachedThreshold={0.2}
                        keyExtractor={(movie) => movie.nmid}
                        ListEmptyComponent={
                            <Text style={{color: mainTheme.muted, padding: 20, textAlign: "center"}}>
                                No movies found. Try another search or clear your filters.
                            </Text>
                        }
                        ListFooterComponent={loadingMore ? (
                            <ActivityIndicator
                                color={mainTheme.accent}
                                accessibilityLabel="Loading more movies"
                            />
                        ) : null}
                        renderItem={({item}) => {
                            return <MovieCard
                                loggedIn={loggedIn}
                                movie={item}
                                preference={likedMovies[item.nmid]}
                                onSwipe={setPreference}
                                onPress={handleMoviePress}
                            />
                        }}
                    />
                </View>

                {selectedMovie !== null && (
                    <ExpandedCard
                        movie={selectedMovie.movie}
                        layout={selectedMovie.layout}
                        onClose={() => setSelectedMovie(null)}
                    />
                )}
            </View>
        </GestureHandlerRootView>
    )
}
