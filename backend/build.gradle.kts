plugins {
	java
	id("org.springframework.boot") version "4.1.0"
	id("io.spring.dependency-management") version "1.1.7"
}

group = "com.pocketphrases"
version = "0.0.1-SNAPSHOT"

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(21)
	}
}

repositories {
	mavenCentral()
}

dependencies {
	implementation("org.springframework.boot:spring-boot-starter-webmvc")
	// Firestore access for the (optional, off-by-default) email whitelist gate.
	implementation("com.google.firebase:firebase-admin:9.9.0")
	// Official Anthropic SDK, used only by the free-text "describe your situation" endpoint.
	implementation("com.anthropic:anthropic-java:2.52.0")
	testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> {
	useJUnitPlatform()
}
