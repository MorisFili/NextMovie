package com.example.data

import com.example.interfaces.Movie

class MovieCache(movies: Collection<Movie>) {

    companion object {
        const val CAPACITY = 100
        const val REFILL_THRESHOLD = 40
    }

    private val movies = arrayOfNulls<Movie>(CAPACITY)

    private var head = 0
    private var tail = 0
    private var size = 0


    init {
        addAll(movies)
    }

    @Synchronized
    fun addAll(batch: Collection<Movie>) {
        for (movie in batch) {
            if (size == CAPACITY) break

            movies[tail] = movie
            tail = (tail + 1) % CAPACITY
            size++
        }
    }

    @Synchronized
    fun pollBatch(amount: Int): List<Movie> {
        val batch = ArrayList<Movie>(minOf(amount, size))

        repeat(minOf(amount, size)) {
            batch.add(movies[head]!!)
            movies[head] = null

            head = (head + 1) % CAPACITY
            size--
        }

        return batch
    }


    @Synchronized
    fun needsRefill(): Boolean {
        return size < REFILL_THRESHOLD
    }

    @Synchronized
    fun topUpAmt(): Int {
        return CAPACITY - size
    }

    @Synchronized
    fun clear() {
        movies.fill(null)

        head = 0
        tail = 0
        size = 0
    }
}