plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.serialization)
    application
}

group = "com.example"
version = "1.0.0"

kotlin {
    jvmToolchain(17)
    sourceSets {
        main {
            kotlin.setSrcDirs(listOf("src"))
        }
        test {
            kotlin.setSrcDirs(listOf("test"))
        }
    }
}

sourceSets {
    main {
        resources.setSrcDirs(listOf("resources"))
    }
}

application {
    mainClass.set("com.example.MainKt")
}

dependencies {
    implementation(platform("io.ktor:ktor-bom:${libs.versions.ktor.get()}"))
    implementation("io.ktor:ktor-server-content-negotiation-jvm")
    implementation("io.ktor:ktor-serialization-kotlinx-json-jvm")
    implementation("io.ktor:ktor-server-auth-jvm")
    implementation("io.ktor:ktor-server-core")
    implementation("io.ktor:ktor-server-netty")
    implementation(libs.logback.classic)
    implementation(libs.sqlite.jdbc)
    implementation("de.mkammerer:argon2-jvm:2.12")

    testImplementation(kotlin("test-junit5"))
    testImplementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.11.0")
    testImplementation(platform("org.junit:junit-bom:5.13.4"))
    testRuntimeOnly("org.junit.jupiter:junit-jupiter-engine")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.test {
    useJUnitPlatform()
    // Database tests must never open the application's real database.
    val testWorkspace = layout.buildDirectory.dir("test-workspace").get().asFile
    workingDir(testWorkspace)
    doFirst {
        testWorkspace.resolve("backend/data").mkdirs()
    }
}

tasks.register<JavaExec>("seedMovies") {
    group = "application"
    description = "Seed the movie database from movies_with_trailers.json (optional -Pdataset=path)."
    dependsOn(tasks.testClasses)
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("SeedMovieDatabase")
    workingDir(rootProject.projectDir.parentFile)
    maxHeapSize = "512m"
    providers.gradleProperty("dataset").orNull?.let { args(it) }
}
