# =====================================================================
# Builds the backend into a small container image, in two stages:
#  1. "build": a full JDK compiles the code and packages the jar
#  2. runtime: only a Java runtime and the jar, so the image stays small
# =====================================================================
FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -q -B dependency:go-offline
COPY src src
RUN ./mvnw -q -B package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
# Run as an ordinary user, never as root inside the container.
RUN useradd --system --uid 10001 edumate && mkdir -p /app/storage && chown edumate /app/storage
COPY --from=build /workspace/target/edumate-backend-*.jar app.jar
USER edumate
EXPOSE 8080
ENV SPRING_PROFILES_ACTIVE=docker \
    STORAGE_ROOT=/app/storage
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
