"""
Word lists and small rules used by build_explainer.py to explain repetitive lines automatically.
Everything here is plain data or tiny functions; the hand-written notes always win over these.
"""
from __future__ import annotations

import html
import re
from dataclasses import dataclass
from pathlib import Path

from page_template import PAGE_TEMPLATE  # noqa: F401  (re-exported for the builder)
from glossary import glossary_html  # noqa: F401
from file_titles import FILE_TITLES  # noqa: F401


def esc(text: str) -> str:
    return html.escape(text, quote=False)


@dataclass
class Context:
    path: str
    lines: list[str]
    index: dict[str, str]

    def prev_code(self, n: int) -> str:
        """The nearest non-blank line above line n."""
        for k in range(n - 2, -1, -1):
            if self.lines[k].strip():
                return self.lines[k].strip()
        return ""


def comment_explanation(said: str, count: int) -> str:
    if count == 1:
        return "<b>Comment</b> – a note for people. The computer skips it completely."
    return (f"<b>Comment ({count} lines)</b> – a note written for people reading the code. "
            "The computer skips every one of these lines. Read it: it says in plain words what the code below does.")


# =====================================================================
#  JAVA
# =====================================================================
JAVA_IMPORTS: dict[str, str] = {
    # ---- java.* (comes with Java itself)
    "ArrayList": "a list that can grow as you add things to it",
    "BigDecimal": "exact decimal numbers (like 62500.00 or 74.99) with no rounding surprises; used for money, marks and percentages",
    "BufferedImage": "a picture held in memory, pixel by pixel (used to draw the placeholder passport photo)",
    "ByteArrayOutputStream": "a bucket that collects bytes in memory",
    "ChronoUnit": "units of time such as DAYS, HOURS, MINUTES, used to add or measure time",
    "Clock": "a replaceable clock: code asks it for \"now\", and tests can swap in a fixed clock",
    "Collection": "the general idea of \"a group of things\" (lists and sets are both collections)",
    "Collections": "handy tools for lists, such as shuffling them",
    "Collectors": "recipes for turning a stream of items into a list, a map or a group",
    "Color": "a colour (used when drawing the placeholder photo)",
    "Comparator": "a rule for putting things in order (who comes first)",
    "CountDownLatch": "a starting gate for threads: everybody waits until it is opened",
    "DateTimeFormatter": "turns dates and times into text in a chosen pattern",
    "DayOfWeek": "the days MONDAY ... SUNDAY",
    "EnumSet": "a fast set that holds values of one enum (one fixed list of choices)",
    "ExecutorService": "a small team of worker threads that can run jobs at the same time",
    "Executors": "a factory that creates teams of worker threads",
    "Files": "reads, writes, moves and deletes files on the disk",
    "Function": "\"a function as a value\": a small piece of code that can be passed around",
    "GeneralSecurityException": "the general error for security problems (for example a missing encryption algorithm)",
    "Graphics2D": "a pen for drawing on a picture",
    "HashMap": "a lookup table: find a value quickly by its key",
    "HashSet": "a bag that never holds the same thing twice",
    "HexFormat": "turns bytes into hexadecimal text such as 9f86d0... and back",
    "IOException": "the error thrown when reading or writing a file (or network) fails",
    "ImageIO": "saves a picture as a PNG/JPEG file (or reads one)",
    "Instant": "one exact moment in time, the same all over the world",
    "IsoFields": "ISO calendar facts such as the week number of the year",
    "LinkedHashMap": "a lookup table that remembers the order things were put in",
    "List": "an ordered list of things",
    "LocalDate": "a calendar date without a time, e.g. 2026-09-28",
    "LocalTime": "a clock time without a date, e.g. 06:14 PM",
    "Locale": "language and country settings (used to make text uppercase safely)",
    "Map": "a lookup table of key → value pairs",
    "Mac": "the machine that computes an HMAC, a tamper-proof signature made with a secret key",
    "MessageDigest": "computes fingerprints (hashes) such as SHA-256, and compares them safely",
    "NoSuchAlgorithmException": "the error thrown if an encryption/hash algorithm is not available",
    "Objects": "small helper checks such as \"is this not null?\"",
    "Optional": "a box that either holds one value or is empty – a safe way to say \"maybe nothing\"",
    "Path": "the location of a file or folder on disk",
    "Paths": "creates Path objects from text such as \"./storage\"",
    "Period": "a length of time in years/months/days (used to work out someone's age)",
    "Random": "a random-number generator (seeded, so the demo data is the same every run)",
    "RoundingMode": "the rule for rounding numbers, e.g. HALF_UP: 8.625 → 8.63",
    "SecretKey": "a secret key for signing or encrypting",
    "SecretKeySpec": "builds a SecretKey from raw bytes",
    "SecureRandom": "a random-number generator strong enough for passwords and codes (OTPs)",
    "Serializable": "a promise that objects of this type can be turned into bytes (needed to store them in Redis)",
    "Set": "a group of things with no duplicates",
    "StandardCharsets": "names of text encodings such as UTF-8",
    "StandardCopyOption": "options for moving files, e.g. ATOMIC_MOVE (all at once or not at all)",
    "Stream": "a pipeline for processing many items one after another (filter, map, collect)",
    "TimeUnit": "units of time used when waiting, such as SECONDS",
    "UUID": "a random, practically unique id such as 3f2c9a1b-...",
    "UncheckedIOException": "an IOException wrapped so it does not have to be declared everywhere",
    "Year": "a calendar year such as 2026",
    "ZoneId": "a time zone such as Asia/Kolkata (Indian Standard Time)",
    # ---- jakarta.* (standard Java server / database rules)
    "Column": "@Column: this field is stored in a database column (you can give its name, whether it may be empty ...)",
    "Entity": "@Entity: objects of this class are saved as rows of a database table",
    "EnumType": "how an enum is stored in the database; STRING stores its name, e.g. \"FACULTY\"",
    "Enumerated": "@Enumerated: store this enum field in the database (as its name)",
    "GeneratedValue": "@GeneratedValue: the database invents the id number automatically",
    "GenerationType": "the ways an id can be generated; IDENTITY = the database counts 1, 2, 3 ...",
    "Id": "@Id: this field is the row's unique id (the primary key)",
    "LockModeType": "kinds of database lock; PESSIMISTIC_WRITE = lock the row until my transaction finishes",
    "Table": "@Table: the name of the database table for this class",
    "Version": "@Version: a counter the database library increases on every save, to detect two people editing at once",
    "HttpServletRequest": "everything about the incoming web request (address, headers, who is logged in ...)",
    "HttpServletResponse": "the web answer being built (status code, headers, body)",
    "Valid": "@Valid: check the rules (@NotBlank, @Size ...) of the object before using it",
    "DecimalMax": "@DecimalMax: the number must not be bigger than this",
    "DecimalMin": "@DecimalMin: the number must not be smaller than this",
    "Email": "@Email: the text must look like an e-mail address",
    "Max": "@Max: the whole number must not be bigger than this",
    "Min": "@Min: the whole number must not be smaller than this",
    "NotBlank": "@NotBlank: the text must contain at least one visible character",
    "NotEmpty": "@NotEmpty: the list must contain at least one item",
    "NotNull": "@NotNull: the value must be present (not null)",
    "Past": "@Past: the date must be before today",
    "Pattern": "@Pattern: the text must match this pattern (regular expression)",
    "Size": "@Size: limits how long the text (or list) may be",
    # ---- Spring
    "SpringApplication": "the class that starts a Spring Boot application",
    "SpringBootApplication": "@SpringBootApplication: \"this is a Spring Boot app – find and set up everything automatically\"",
    "ConfigurationPropertiesScan": "@ConfigurationPropertiesScan: find classes marked @ConfigurationProperties and fill them from application.yml",
    "ConfigurationProperties": "@ConfigurationProperties: fill this class from settings in application.yml",
    "EnableCaching": "@EnableCaching: switch on @Cacheable / @CacheEvict",
    "EnableScheduling": "@EnableScheduling: switch on @Scheduled jobs (things that run every few seconds)",
    "ApplicationArguments": "the command-line arguments given when the app started",
    "ApplicationRunner": "something that runs once, right after the application has started",
    "ConditionalOnProperty": "@ConditionalOnProperty: only create this bean if a setting has a certain value",
    "Bean": "@Bean: the object returned by this method is handed to Spring to share with everyone who needs it",
    "Configuration": "@Configuration: this class contains setup code (usually @Bean methods)",
    "Component": "@Component: Spring should create one object of this class and share it",
    "Service": "@Service: like @Component; marks a class holding business logic",
    "Order": "@Order: in which order several similar components run (1 before 2)",
    "Autowired": "@Autowired: Spring puts the needed object into this field automatically",
    "Qualifier": "@Qualifier: when several beans fit, pick the one with this name",
    "Transactional": "@Transactional: everything in this method is one database transaction – all saved together, or none",
    "TransactionSynchronization": "a callback that runs when a transaction finishes (committed or rolled back)",
    "TransactionSynchronizationManager": "lets code register such callbacks on the current transaction",
    "Cacheable": "@Cacheable: remember this method's answer; next time return the remembered answer",
    "CacheEvict": "@CacheEvict: forget remembered answers (because the data changed)",
    "Scheduled": "@Scheduled: run this method automatically on a timer",
    "JpaRepository": "gives a repository ready-made methods: save, findById, findAll, delete, count ...",
    "Query": "@Query: the exact database query (JPQL) this repository method runs",
    "Modifying": "@Modifying: this @Query changes data (UPDATE/DELETE) instead of reading it",
    "Lock": "@Lock: lock the rows this query reads",
    "Param": "@Param: connects a method parameter to a :name inside the query",
    "PageRequest": "\"give me page 0 with 200 items\" – limits how many rows a query returns",
    "Pageable": "the general idea of a page request (page number and size)",
    "JdbcTemplate": "runs plain SQL directly on the database (used for fast bulk inserts)",
    "DataIntegrityViolationException": "the error when the database refuses a write, e.g. a UNIQUE rule was broken",
    "ObjectOptimisticLockingFailureException": "the error when someone else saved the same row first (@Version mismatch)",
    "ParameterizedTypeReference": "tells a web client the exact type of a generic answer, e.g. Map<String, Object>",
    "ByteArrayResource": "file-like bytes in memory",
    "PathResource": "a file on disk that Spring can send as a download",
    "Resource": "something that can be read like a file (from disk, memory, the jar ...)",
    "MethodParameter": "describes one parameter of a controller method",
    "HttpHeaders": "the names of standard HTTP headers, e.g. Content-Disposition, Authorization",
    "HttpMethod": "GET, POST, PUT, DELETE ...",
    "GET": "the HTTP method GET (read something)",
    "POST": "the HTTP method POST (create / do something)",
    "PUT": "the HTTP method PUT (replace / update something)",
    "DELETE": "the HTTP method DELETE (remove something)",
    "HttpStatus": "HTTP status codes by name: OK (200), NOT_FOUND (404), CONFLICT (409) ...",
    "MediaType": "content types such as application/json or multipart/form-data",
    "ResponseEntity": "a full HTTP answer: status code + headers + body",
    "ContentDisposition": "builds the Content-Disposition header that says \"show inline\" or \"download as file x.pdf\"",
    "HttpMessageNotReadableException": "the error when the request body is not valid JSON",
    "PathContainer": "a URL path split into parts, for pattern matching",
    "PathPatternParser": "reads URL patterns like /api/fees/payments/* and checks if a path matches",
    "SimpleClientHttpRequestFactory": "the basic engine that makes outgoing HTTP calls",
    "LinkedMultiValueMap": "a map where one key can have several values (used for form data)",
    "MultiValueMap": "the general idea of a key → several values map",
    "DateTimeFormat": "@DateTimeFormat: how to read a date from the URL, e.g. ISO 2026-09-28",
    "HttpRequestMethodNotSupportedException": "the error when a URL is called with the wrong method (e.g. GET instead of POST)",
    "ExceptionHandler": "@ExceptionHandler: this method handles errors of the given type",
    "RestControllerAdvice": "@RestControllerAdvice: this class's @ExceptionHandler methods apply to every controller",
    "RestController": "@RestController: this class answers web requests, and its return values are sent as JSON",
    "RequestMapping": "@RequestMapping: the URL prefix every method of this controller lives under",
    "GetMapping": "@GetMapping: this method answers GET requests (reading)",
    "PostMapping": "@PostMapping: this method answers POST requests (creating / doing)",
    "PutMapping": "@PutMapping: this method answers PUT requests (updating)",
    "DeleteMapping": "@DeleteMapping: this method answers DELETE requests (removing)",
    "PathVariable": "@PathVariable: take this value from the URL itself, e.g. the 7 in /applications/7",
    "RequestBody": "@RequestBody: build this object from the JSON sent in the request body",
    "RequestParam": "@RequestParam: take this value from the URL's ?name=value part (or a form field)",
    "MethodArgumentNotValidException": "the error when a @Valid request body breaks one of its rules",
    "MissingServletRequestParameterException": "the error when a required ?name= parameter is missing",
    "MissingServletRequestPartException": "the error when a required part of an upload form is missing",
    "MethodArgumentTypeMismatchException": "the error when a URL value has the wrong type (e.g. \"abc\" for a number)",
    "MaxUploadSizeExceededException": "the error when an uploaded file is bigger than the allowed size",
    "MultipartFile": "an uploaded file as Spring receives it (name, size, bytes)",
    "NoResourceFoundException": "the error when nothing exists at the requested URL",
    "HandlerMethodArgumentResolver": "a helper that teaches Spring how to fill a special controller parameter",
    "ModelAndViewContainer": "internal Spring MVC helper (not used here, but part of the method signature)",
    "NativeWebRequest": "the current web request, in a general form",
    "WebDataBinderFactory": "internal Spring MVC helper (not used here, but part of the method signature)",
    "WebMvcConfigurer": "a way to add our own settings to Spring MVC",
    "HandlerMethod": "one controller method that answers a URL",
    "RequestMappingHandlerMapping": "Spring's list of every URL and the controller method that answers it",
    "RequestMappingInfo": "the URL pattern and HTTP methods of one controller method",
    "RestClient": "Spring's tool for calling other web services over HTTP",
    "RestClientException": "the error when an outgoing HTTP call fails",
    "StandardCopyOption": "options for moving files",
    # ---- Spring Security
    "AccessDeniedException": "the error \"you are logged in, but not allowed to do this\" (403)",
    "AccessDeniedHandler": "the code that answers when access is denied",
    "Authentication": "who is logged in for this request, and their permissions",
    "AuthenticationEntryPoint": "the code that answers when nobody is logged in (401)",
    "AuthenticationException": "the error \"you are not logged in / your token is invalid\"",
    "AuthorizeHttpRequestsConfigurer": "the part of Spring Security that decides which URLs need which roles",
    "BCryptPasswordEncoder": "hashes passwords with bcrypt, a deliberately slow one-way scramble",
    "EnableMethodSecurity": "@EnableMethodSecurity: allow role checks on individual methods",
    "EnableWebSecurity": "@EnableWebSecurity: switch on Spring Security for web requests",
    "HttpSecurity": "the builder used to describe the whole web security setup",
    "PasswordEncoder": "anything that can hash a password and check a password against a hash",
    "SecurityContextHolder": "holds the Authentication of the request being handled right now",
    "SecurityFilterChain": "the chain of security checks every request passes through",
    "SessionCreationPolicy": "whether the server keeps login sessions; STATELESS = never",
    "Jwt": "a decoded, signature-checked JSON Web Token (the login wristband)",
    "JwtClaimsSet": "the facts (claims) written inside a JWT: user id, role, expiry ...",
    "JwtDecoder": "checks a JWT's signature and expiry, then reads it",
    "JwtEncoder": "creates and signs a JWT",
    "JwtEncoderParameters": "what to put in a new JWT: header + claims",
    "JwsHeader": "the header of a signed JWT, naming the signing algorithm",
    "MacAlgorithm": "HMAC signing algorithms, e.g. HS256 (HMAC with SHA-256)",
    "NimbusJwtDecoder": "the JWT decoder built on the Nimbus library",
    "NimbusJwtEncoder": "the JWT encoder built on the Nimbus library",
    "JwtAuthenticationConverter": "turns a checked JWT into Spring's Authentication (with roles)",
    "JwtGrantedAuthoritiesConverter": "reads the roles out of a JWT claim",
    "ImmutableSecret": "a fixed secret key wrapped for the Nimbus JWT library",
    # ---- other libraries
    "Logger": "writes messages to the server log (the console)",
    "LoggerFactory": "creates a Logger for a class",
    "JsonMapper": "Jackson's JSON converter: Java object ↔ JSON text",
    # ---- tests
    "Test": "@Test: this method is an automated test",
    "DisplayName": "@DisplayName: the readable name shown in the test report",
    "ParameterizedTest": "@ParameterizedTest: run this test once for each row of data",
    "CsvSource": "@CsvSource: the rows of test data, written like a spreadsheet (comma-separated)",
    "AfterAll": "@AfterAll: run this once after all tests of the class",
    "Assertions": "AssertJ's checks: assertThat(x).isEqualTo(y) ...",
    "assertThat": "assertThat(x): start a check on x; the test fails if the check fails",
    "assertThatThrownBy": "check that some code throws the expected error",
    "SpringBootTest": "@SpringBootTest: start the whole application for this test",
    "AutoConfigureMockMvc": "@AutoConfigureMockMvc: give the test a MockMvc \"fake browser\"",
    "MockMvc": "a fake browser that sends requests straight into the app, without a network",
    "TestPropertySource": "@TestPropertySource: change some settings only for tests",
    "DynamicPropertySource": "@DynamicPropertySource: settings computed while the test starts (e.g. a database URL)",
    "DynamicPropertyRegistry": "where @DynamicPropertySource writes those settings",
    "ReflectionTestUtils": "lets a test set a private field directly (here: an entity's id)",
    "MockMultipartFile": "a fake uploaded file for tests",
    "get": "MockMvc: build a GET request",
    "post": "MockMvc: build a POST request",
    "put": "MockMvc: build a PUT request",
    "multipart": "MockMvc: build a multipart/form-data upload request",
    "status": "MockMvc: check the HTTP status code of the answer",
    "jsonPath": "MockMvc: check a value inside the JSON answer, e.g. $.code",
    "JsonPath": "reads values out of JSON text with paths like $.token",
    "EmbeddedPostgres": "starts a real PostgreSQL database server inside the test run",
}

JAVA_ANNOTATIONS: dict[str, str] = {
    "Override": "<code>@Override</code>: this method replaces (fills in) a method promised by the interface or parent class. The compiler checks the names match.",
    "Id": "<code>@Id</code>: the next field is this row's unique id number (the primary key).",
    "Entity": "<code>@Entity</code>: objects of this class are stored as rows in a database table.",
    "Service": "<code>@Service</code>: Spring creates ONE object of this class when the app starts and hands it to every class that asks for it.",
    "Component": "<code>@Component</code>: Spring creates ONE object of this class when the app starts and shares it.",
    "Configuration": "<code>@Configuration</code>: this class sets things up; its <code>@Bean</code> methods create shared objects.",
    "RestController": "<code>@RestController</code>: this class answers web requests; whatever its methods return is sent back as JSON.",
    "RestControllerAdvice": "<code>@RestControllerAdvice</code>: this class's error handlers apply to every controller.",
    "Bean": "<code>@Bean</code>: the object this method returns is registered with Spring and shared.",
    "Version": "<code>@Version</code>: the next field is a save counter. Every save adds 1; a save based on an old number is refused. This is optimistic locking.",
    "Test": "<code>@Test</code>: the next method is an automated test. <code>mvnw test</code> runs it.",
    "Transactional": "<code>@Transactional</code>: the next method runs as one database transaction – either every change is saved, or (on an error) none is.",
    "SpringBootApplication": "<code>@SpringBootApplication</code>: marks the main class; Spring Boot scans this package and everything below it.",
    "ConfigurationPropertiesScan": "<code>@ConfigurationPropertiesScan</code>: find settings classes (like AppProperties) and fill them from application.yml.",
    "EnableCaching": "<code>@EnableCaching</code>: switches on caching (remembering answers) for methods marked @Cacheable.",
    "EnableScheduling": "<code>@EnableScheduling</code>: switches on timed jobs such as the notification dispatcher.",
    "EnableWebSecurity": "<code>@EnableWebSecurity</code>: turns on Spring Security for web requests.",
    "EnableMethodSecurity": "<code>@EnableMethodSecurity</code>: allows extra role checks on single methods.",
    "AfterAll": "<code>@AfterAll</code>: run the next method once, after all tests in this class.",
    "ParameterizedTest": "<code>@ParameterizedTest</code>: run the next test once for every row of data given below it.",
    "SpringBootTest": "<code>@SpringBootTest</code>: start the complete application (in memory) for these tests.",
    "AutoConfigureMockMvc": "<code>@AutoConfigureMockMvc</code>: give the tests a MockMvc – a fake browser that calls the app without a network.",
    "DynamicPropertySource": "<code>@DynamicPropertySource</code>: the next method supplies settings that are only known while the test starts.",
    "Autowired": "<code>@Autowired</code>: Spring fills the next field with the matching shared object.",
    "Valid": "<code>@Valid</code>: check the object's rules before the method runs.",
    "Modifying": "<code>@Modifying</code>: the query below changes data instead of only reading it.",
}


def java_annotation(line: str) -> str | None:
    s = line.strip()
    m = re.match(r"^@(\w+)(\((.*)\))?$", s)
    if not m:
        return None
    name, args = m.group(1), m.group(3) or ""
    if name in JAVA_ANNOTATIONS and not args:
        return JAVA_ANNOTATIONS[name]
    if name == "Table":
        t = re.search(r'name\s*=\s*"([^"]+)"', args)
        return f"<code>@Table</code>: rows of this class live in the database table <code>{esc(t.group(1)) if t else '?'}</code>."
    if name == "Column":
        parts = []
        col = re.search(r'name\s*=\s*"([^"]+)"', args)
        if col:
            parts.append(f"its database column is called <code>{esc(col.group(1))}</code>")
        if "nullable = false" in args:
            parts.append("it may never be empty (NOT NULL)")
        if "unique = true" in args:
            parts.append("no two rows may have the same value (UNIQUE)")
        return "<code>@Column</code>: the next field is stored in the database" + (": " + "; ".join(parts) if parts else "") + "."
    if name == "GeneratedValue":
        return "<code>@GeneratedValue(IDENTITY)</code>: the database gives each new row the next number (1, 2, 3 ...) automatically."
    if name == "Enumerated":
        return "<code>@Enumerated(STRING)</code>: save this choice in the database as its name (e.g. \"FACULTY\"), not as a number, so the table stays readable."
    if name == "Transactional":
        extras = []
        if "readOnly = true" in args:
            extras.append("<b>read-only</b>: it only reads, which lets the database work faster")
        if "noRollbackFor" in args:
            extras.append("<b>noRollbackFor = ApiException</b>: even when this method throws our ApiException, the changes it made are still saved (needed to keep counters such as failed attempts)")
        return "<code>@Transactional</code>: runs as one database transaction – all changes saved together or none" + ("; " + "; ".join(extras) if extras else "") + "."
    if name == "RequestMapping":
        p = re.search(r'"([^"]+)"', args)
        return f"<code>@RequestMapping</code>: every URL of this controller starts with <code>{esc(p.group(1)) if p else ''}</code>."
    if name in ("GetMapping", "PostMapping", "PutMapping", "DeleteMapping"):
        verb = name.replace("Mapping", "").upper()
        p = re.search(r'"([^"]*)"', args)
        where = f" at <code>…{esc(p.group(1))}</code> (added to the controller's prefix)" if p else " at the controller's own prefix"
        return f"<code>@{name}</code>: the next method answers HTTP <b>{verb}</b> requests{where}."
    if name == "Order":
        return f"<code>@Order({esc(args)})</code>: when several start-up runners exist, this one runs as number {esc(args)}."
    if name == "Scheduled":
        return "<code>@Scheduled</code>: Spring calls the next method automatically on a timer (see the values: PT5S = every 5 seconds)."
    if name == "Cacheable":
        return "<code>@Cacheable</code>: the first call's answer is remembered in the cache; later calls with the same key get the remembered answer without touching the database."
    if name == "CacheEvict":
        return "<code>@CacheEvict</code>: after this method runs, the remembered answers in that cache are thrown away, so nobody sees stale data."
    if name == "ConfigurationProperties":
        return "<code>@ConfigurationProperties(prefix = \"edumate\")</code>: fill this object from every setting under <code>edumate:</code> in application.yml."
    if name == "ConditionalOnProperty":
        return "<code>@ConditionalOnProperty</code>: this component exists only when <code>edumate.demo.seed</code> is <code>true</code> (dev and docker profiles)."
    if name == "Lock":
        return "<code>@Lock(PESSIMISTIC_WRITE)</code>: the query below locks the row it reads; anybody else wanting it waits until this transaction ends."
    if name == "Modifying":
        extras = []
        if "clearAutomatically" in args:
            extras.append("afterwards the cached copies of objects are cleared, so fresh data is read next")
        if "flushAutomatically" in args:
            extras.append("pending changes are written to the database first")
        return "<code>@Modifying</code>: the query below changes data (UPDATE / DELETE)" + ("; " + "; ".join(extras) if extras else "") + "."
    if name == "DisplayName":
        return f"<code>@DisplayName</code>: the readable name of this test in the test report: {esc(args)}."
    if name == "Qualifier":
        return f"<code>@Qualifier({esc(args)})</code>: several objects of this type exist; take the one with this name."
    if name == "TestPropertySource":
        return "<code>@TestPropertySource</code>: for tests only, change these settings (here: keep test uploads in target/test-storage)."
    validation = {
        "NotBlank": "the text must contain at least one visible character",
        "NotNull": "a value must be given",
        "NotEmpty": "the list must contain at least one item",
        "Email": "the text must look like an e-mail address",
        "Past": "the date must be before today",
        "Size": "limits the length",
        "Pattern": "the text must match a pattern",
        "DecimalMin": "the number must not be below a minimum",
        "DecimalMax": "the number must not be above a maximum",
        "Min": "the whole number must not be below a minimum",
        "Max": "the whole number must not be above a maximum",
    }
    if name in validation:
        msg = re.search(r'message\s*=\s*"([^"]+)"', args)
        limits = ", ".join(f"{k} = {esc(v)}" for k, v in re.findall(r"(value|max|min|regexp)\s*=\s*(\"[^\"]*\"|\d+)", args))
        if not limits and args and not msg:
            limits = esc(args)
        text = f"<b>Validation rule</b> <code>@{name}</code>: {validation[name]}" + (f" ({limits})" if limits else "") + "."
        if msg:
            text += f" If it is broken, the user sees: <q>{esc(msg.group(1))}</q>"
        return text
    if name == "SuppressWarnings":
        return "<code>@SuppressWarnings</code>: tells the compiler not to warn about this."
    if name == "ExceptionHandler":
        types = re.findall(r"(\w+)\.class", args)
        return "<code>@ExceptionHandler</code>: the next method is called whenever a request fails with " + \
            " or ".join(f"<code>{t}</code>" for t in types) + "."
    return None


def java_import(ctx: Context, line: str) -> str | None:
    m = re.match(r"^import (static )?([\w.]+?)(\.\*)?;$", line.strip())
    if not m:
        return None
    full = m.group(2)
    simple = full.rsplit(".", 1)[-1]
    if full.startswith("com.edumate"):
        target = ctx.index.get(simple) or ctx.index.get(full.rsplit(".", 2)[-2] if m.group(1) else "")
        owner = full.rsplit(".", 2)[-2] if m.group(1) else simple
        link = ctx.index.get(owner)
        name_html = f'<a href="#{link}">{esc(owner)}</a>' if link else f"<code>{esc(owner)}</code>"
        if m.group(1):
            return f"Brings in <code>{esc(simple)}</code> from our own {name_html}, so it can be written without the class name in front."
        return f"Brings in our own class {name_html} (from package <code>{esc(full.rsplit('.', 1)[0])}</code>) so this file can use it."
    meaning = JAVA_IMPORTS.get(simple)
    origin = library_of(full)
    if meaning:
        return f"Brings in <code>{esc(simple)}</code> ({origin}): {esc(meaning) if '<' not in meaning else meaning}."
    return f"Brings in <code>{esc(simple)}</code> from <code>{esc(full.rsplit('.', 1)[0])}</code> ({origin})."


def library_of(full: str) -> str:
    if full.startswith("java.") or full.startswith("javax."):
        return "part of Java itself"
    if full.startswith("jakarta."):
        return "Jakarta EE, the standard Java server rules"
    if full.startswith("org.springframework.security"):
        return "Spring Security"
    if full.startswith("org.springframework.boot"):
        return "Spring Boot"
    if full.startswith("org.springframework"):
        return "Spring Framework"
    if full.startswith("org.junit"):
        return "JUnit 5, the test framework"
    if full.startswith("org.assertj"):
        return "AssertJ, readable test checks"
    if full.startswith("tools.jackson"):
        return "Jackson 3, the JSON library"
    if full.startswith("org.slf4j"):
        return "SLF4J logging"
    if full.startswith("com.nimbusds"):
        return "Nimbus JOSE, the JWT library"
    if full.startswith("com.jayway"):
        return "JsonPath"
    if full.startswith("io.zonky"):
        return "Zonky embedded PostgreSQL"
    return "a library"


DECLARATION = re.compile(r"^(public\s+|abstract\s+|final\s+|static\s+|private\s+)*(class|record|interface|enum)\s+(\w+)(.*)$")
CONSTRUCTOR = re.compile(r"^(public|protected|private)?\s*([A-Z]\w*)\((.*)$")
REPO_METHOD = re.compile(r"^(List|Optional|long|boolean|int|BigDecimal)(<([\w<>, ]+)>)?\s+(find\w*|exists\w*|count\w*|delete\w*)\((.*)\);$")
RECORD_COMPONENT = re.compile(r"^(@\w+(\([^)]*\))?\s+)*([\w<>, .?\[\]]+?)\s+(\w+)(,|\)\s*\{|\)\s*implements .*\{)$")


def split_camel(name: str) -> list[str]:
    return re.findall(r"[A-Z][a-z0-9]*|[a-z0-9]+", name)


def describe_derived_query(method: str) -> str:
    """Explains a Spring Data method name such as findByProgramIdAndSemesterOrderByUsn."""
    m = re.match(r"^(find|exists|count|delete)(First|Top\d*)?(All)?By(.*?)(OrderBy(.*))?$", method)
    if not m:
        m2 = re.match(r"^findAllBy?OrderBy(.*)$", method)
        if m2:
            return f"all rows, sorted by {order_words(m2.group(1))}"
        return ""
    verb = {"find": "finds rows", "exists": "answers true/false: is there a row", "count": "counts rows",
            "delete": "deletes rows"}[m.group(1)]
    first = " (only the first one)" if m.group(2) else ""
    conditions = m.group(4)
    parts = re.split(r"(And|Or)(?=[A-Z])", conditions) if conditions else []
    words = []
    for p in parts:
        if p in ("And", "Or"):
            words.append(p.lower())
            continue
        if not p:
            continue
        op = "="
        for suffix, text in (("IsNull", " is empty"), ("True", " is true"), ("In", " is one of the given values"),
                             ("IsNotNull", " is not empty")):
            if p.endswith(suffix):
                p = p[: -len(suffix)]
                op = text
                break
        field = p[0].lower() + p[1:]
        words.append(f"<code>{field}</code>{' = the given value' if op == '=' else op}")
    order = f", sorted by {order_words(m.group(6))}" if m.group(6) else ""
    return f"{verb}{first} where " + " ".join(words) + order if words else verb + first + order


def order_words(text: str) -> str:
    out = []
    for piece in re.split(r"(?<=Asc)|(?<=Desc)", text):
        if not piece:
            continue
        direction = " (newest/biggest first)" if piece.endswith("Desc") else ""
        name = re.sub(r"(Asc|Desc)$", "", piece)
        if name:
            out.append(f"<code>{name[0].lower() + name[1:]}</code>{direction}")
    return ", then ".join(out)


FIELD = re.compile(r"^(private|public|protected)\s+(static\s+)?(final\s+)?([\w<>\[\], .?]+?)\s+(\w+)(\s*=\s*(.+))?;$")
GETTER = re.compile(r"^public\s+[\w<>\[\], .?]+\s+(get|is)(\w+)\(\)\s*\{$")
SETTER = re.compile(r"^public\s+void\s+set(\w+)\((\w[\w<>, ]*)\s+(\w+)\)\s*\{$")
THIS_ASSIGN = re.compile(r"^this\.(\w+)\s*=\s*(\w+);$")
JPA_CTOR = re.compile(r"^protected\s+(\w+)\(\)\s*\{$")


def java_line(ctx: Context, n: int, line: str):
    s = line.strip()
    if s.startswith("package "):
        pkg = s[len("package "):].rstrip(";")
        return (f"<b>Package</b> = the folder/group this file belongs to: <code>{esc(pkg)}</code> "
                f"(the folder <code>{esc(pkg.replace('.', '/'))}</code>). Every Java file starts by saying where it lives.")
    if s.startswith("import "):
        return java_import(ctx, s)
    if s.startswith("@"):
        return java_annotation(s)
    m = DECLARATION.match(s)
    if m:
        kind, name, rest = m.group(2), m.group(3), m.group(4)
        what = {
            "class": "a <b>class</b> – a blueprint for objects",
            "record": "a <b>record</b> – a compact class that only carries data; Java writes the constructor and getters for us",
            "interface": "an <b>interface</b> – a list of promised methods",
            "enum": "an <b>enum</b> – a type with a fixed list of allowed values",
        }[kind]
        extra = ""
        repo = re.search(r"extends JpaRepository<(\w+),\s*(\w+)>", rest)
        if repo:
            extra = (f" It is a <b>repository</b> for <code>{repo.group(1)}</code> rows whose id is a <code>{repo.group(2)}</code>. "
                     "Because it extends <code>JpaRepository</code>, it automatically has save, findById, findAll, "
                     "delete and count. We never write the code of this interface: Spring generates it at start-up.")
        elif "implements" in rest:
            extra = f" It <em>implements</em> {esc(rest.split('implements', 1)[1].strip(' {'))}, i.e. it provides the methods that interface promises."
        elif "extends" in rest:
            extra = f" It <em>extends</em> (is a special kind of) {esc(rest.split('extends', 1)[1].strip(' {'))}."
        if kind == "record" and rest.startswith("("):
            extra += " Its fields are listed inside the round brackets."
        public = "public (usable from anywhere)" if s.startswith("public") else "not public (only usable in this package/file)"
        return f"Declares {what}, named <code>{name}</code>, {public}.{extra}"
    m = REPO_METHOD.match(s)
    if m and ctx.path.endswith("Repository.java"):
        meaning = describe_derived_query(m.group(4))
        returns = {"List": "a list of", "Optional": "maybe one (or none)", "long": "a count", "int": "a number of rows changed", "boolean": "true/false",
                   "BigDecimal": "a number"}[m.group(1)]
        return (f"<b>Query method</b> <code>{m.group(4)}</code>: Spring reads the method name and writes the SQL itself. "
                f"It {meaning}. Returns {returns} {('<code>' + esc(m.group(3)) + '</code>') if m.group(3) else ''}."
                if meaning else None)
    m = re.match(r'^(open|anyUser|allow)\((\w+), "([^"]+)"(, (.+))?\);(\s*//\s*(.*))?$', s)
    if m and ctx.path.endswith("RoleMatrix.java"):
        method = "any method" if m.group(2) == "null" else f"<b>{m.group(2)}</b>"
        url = esc(m.group(3))
        star = " (<code>*</code> stands for any one part of the address, such as an id; <code>**</code> for any number of parts)" \
            if "*" in m.group(3) else ""
        who = {"open": "<b>anyone</b>, even without logging in",
               "anyUser": "<b>any logged-in user</b>, whatever their role"}.get(m.group(1))
        if who is None:
            roles = [r.strip().replace("_", " ").title() for r in m.group(5).split(",")]
            who = "<b>only</b> " + ", ".join(roles)
        note = f" <span class=\"why\">({esc(m.group(7))})</span>" if m.group(7) else ""
        return f"Rule: {method} <code>{url}</code>{star} may be called by {who}.{note}"
    if s.startswith("super(") and s.endswith(");"):
        return f"Passes <code>{esc(s[6:-2])}</code> to the parent class's constructor (for exceptions, that is the error message)."
    if re.match(r"^private static final Logger log = LoggerFactory\.getLogger\(\w+\.class\);$", s):
        return ("<code>log</code>: this class's logger. <code>log.info(...)</code> / <code>log.warn(...)</code> write a line "
                "to the server's console/log, tagged with this class name. Users never see it; developers do.")
    m = CONSTRUCTOR.match(s)
    if m and m.group(2) == Path(ctx.path).stem and (s.endswith("{") or s.endswith(",")):
        return (f"<b>Constructor</b> of <code>{m.group(2)}</code>: the code that runs when a new object is made. The values in "
                "brackets are handed in; for Spring components Spring itself calls this and passes the helpers listed "
                "(this is <em>constructor injection</em>).")
    if in_record_header(ctx, n):
        m = RECORD_COMPONENT.match(s)
        if m:
            anns = re.findall(r"@(\w+)(?:\(([^)]*)\))?", s.split(m.group(3))[0]) if m.group(1) else []
            rules = "".join(f" Rule: <code>@{a}{'(' + esc(b) + ')' if b else ''}</code>." for a, b in anns)
            return f"Record field <code>{m.group(4)}</code> of type <code>{esc(m.group(3))}</code>.{rules}"
        if PARAMS_LINE.match(s):
            names = re.findall(r"(\w+)\s*(?:,|\)\s*(?:implements [\w, ]+)?\s*\{)", s)
            return ("…more fields of this record: " + ", ".join(f"<code>{nm}</code>" for nm in names)
                    + ". Each becomes a JSON property with the same name when it is sent to the browser.")
    if re.match(r"^[A-Z][A-Z0-9_]*(\([^)]*\))?[,;]?$", s) and is_enum_body(ctx, n):
        value = s.rstrip(",;")
        return f"One allowed value of this enum: <code>{esc(value)}</code>."
    if signature_continuation(ctx, n, s):
        return "…the list of values handed in continues here (it was too long for one line)."
    m = JPA_CTOR.match(s)
    if m and n < len(ctx.lines) and ctx.lines[n].strip().startswith("//"):
        return (f"An empty constructor for <code>{m.group(1)}</code>. It is <code>protected</code> (hidden from our code) "
                "because only Hibernate uses it: when it reads a row from the database it first creates an empty "
                "object with this, then fills in the fields.")
    m = GETTER.match(s)
    if m:
        field = m.group(2)[0].lower() + m.group(2)[1:]
        return (f"<b>Getter</b>: a tiny method others call to <em>read</em> the private field <code>{esc(field)}</code>. "
                "Fields are private (hidden) so nobody can change them by accident; getters let them be read safely.")
    m = SETTER.match(s)
    if m:
        return (f"<b>Setter</b>: a tiny method others call to <em>change</em> the field <code>{esc(m.group(3))}</code>. "
                "Only fields that are meant to change have a setter.")
    prev = ctx.prev_code(n)
    if re.match(r"^return\s+(this\.)?\w+;$", s) and GETTER.match(prev):
        return "Hands the field's current value back to whoever called the getter."
    m = THIS_ASSIGN.match(s)
    if m:
        if m.group(1) == m.group(2):
            return (f"Stores the <code>{esc(m.group(2))}</code> that was handed in into this object's own field "
                    f"<code>this.{esc(m.group(1))}</code>, so the object remembers it.")
        return f"Sets this object's field <code>{esc(m.group(1))}</code> to <code>{esc(m.group(2))}</code>."
    m = FIELD.match(s)
    if m:
        static, final, typ, name, value = m.group(2), m.group(3), m.group(4), m.group(5), m.group(7)
        if static and final:
            return (f"<b>Constant</b> <code>{esc(name)}</code> (type <code>{esc(typ)}</code>) = <code>{esc(value or '')}</code>. "
                    "<code>static final</code> means one fixed value shared by the whole class that can never change.")
        if final and not value:
            return (f"A slot for the <code>{esc(typ)}</code> helper this class needs, called <code>{esc(name)}</code>. "
                    "<code>final</code> = it is set once in the constructor and never replaced. Spring puts the helper "
                    "in automatically (this is called <em>dependency injection</em>).")
        if value:
            return (f"A field <code>{esc(name)}</code> of type <code>{esc(typ)}</code>, starting with the value "
                    f"<code>{esc(value)}</code>.")
        return f"A field (a named box inside each object) called <code>{esc(name)}</code> that holds a <code>{esc(typ)}</code>."
    return None


PARAMS_LINE = re.compile(r"^((@\w+(\([^)]*\))?\s+)*[\w<>\[\]., ?]+\s+\w+,\s*)*(@\w+(\([^)]*\))?\s+)*[\w<>\[\]., ?]+\s+\w+(,|\)\s*(throws [\w, ]+)?\s*\{)$")
SIGNATURE_START = re.compile(r"^(public|protected|private)\s+([\w<>\[\]., ?]+\s+)?\w+\(.*,$")


def signature_continuation(ctx: Context, n: int, s: str) -> bool:
    """True for the 2nd, 3rd … line of a long constructor or method header (parameters only)."""
    if not PARAMS_LINE.match(s):
        return False
    for k in range(n - 2, max(-1, n - 6), -1):
        t = ctx.lines[k].strip()
        if SIGNATURE_START.match(t):
            return True
        if not (t.endswith(",") and PARAMS_LINE.match(t)):
            return False
    return False


def in_record_header(ctx: Context, n: int) -> bool:
    """True when line n is between 'record X(' and the ') {' that ends the record's field list."""
    for k in range(n - 2, -1, -1):
        t = ctx.lines[k].strip()
        if re.search(r"\brecord\s+\w+\(", t):
            return not t.endswith("{")
        if t.endswith("{") or t.endswith(";") or t.endswith("}"):
            return False
    return False


def is_enum_body(ctx: Context, n: int) -> bool:
    for k in range(n - 2, -1, -1):
        t = ctx.lines[k].strip()
        if re.search(r"\benum\s+\w+", t):
            return True
        if t.endswith(";") or t.endswith("}"):
            return False
    return False


# =====================================================================
#  TYPESCRIPT / TSX
# =====================================================================
TS_NAMES: dict[str, str] = {
    "useState": "React's memory for a component: a value that, when changed, redraws the screen",
    "useEffect": "React's \"do this after drawing\" (e.g. load data when the page opens)",
    "useCallback": "React's way to keep the same function between redraws",
    "useMemo": "React's way to keep the same computed value between redraws",
    "useRef": "React's box for a value (or a screen element) that survives redraws without causing one",
    "useContext": "reads a value shared by a Provider higher up",
    "createContext": "creates a shared \"context\" that many components can read",
    "Component": "the older class-style React component (needed for error boundaries)",
    "StrictMode": "React's extra development checks",
    "createRoot": "connects React to the page's <div id=\"root\">",
    "ReactNode": "the type \"anything React can draw\"",
    "FormEvent": "the type of a form's submit event",
    "DragEvent": "the type of a drag-and-drop event",
    "ErrorInfo": "extra details React gives about a crash",
    "BrowserRouter": "React Router: keeps the page in sync with the address bar",
    "Routes": "React Router: the list of pages",
    "Route": "React Router: one address → one page",
    "Navigate": "React Router: jump to another address",
    "NavLink": "React Router: a menu link that knows when it is the active page",
    "Link": "React Router: a link that changes page without reloading",
    "Outlet": "React Router: \"draw the current child page here\"",
    "useNavigate": "React Router: a function to change page from code",
    "useParams": "React Router: reads values from the address, like the id in /admissions/7",
    "useLocation": "React Router: the current address",
    "defineConfig": "Vite: helper that gives the configuration object type checking",
    "react": "the Vite plugin that understands React's JSX",
    "describe": "Vitest: a group of tests",
    "it": "Vitest: one test",
    "expect": "Vitest: a check – the test fails if it is false",
    # ---- React extras
    "useLayoutEffect": "like useEffect, but runs before the screen is painted (no flicker)",
    "useSyncExternalStore": "React's safe way to read a value that lives outside React and redraw when it changes",
    "useId": "React: a unique id for this component, stable between redraws",
    "lazy": "React: load a component's code only when it is first needed (code splitting)",
    "Suspense": "React: what to show while lazily loaded code or data is still on its way",
    "Fragment": "React: a group of elements without an extra box around them",
    "ComponentType": "the type \"any React component\"",
    "CSSProperties": "the type of an inline style object",
    "ReactElement": "the type \"one React element\"",
    "PointerEvent": "the type of a mouse / pen / finger movement event",
    "KeyboardEvent": "the type of a key press event",
    "MouseEvent": "the type of a mouse click event",
    "createPortal": "React DOM: draw an element somewhere else in the page (here: straight into <body>)",
    "flushSync": "React DOM: apply a change to the screen immediately instead of later",
    "useOutlet": "React Router: the element for the current child page (like <Outlet />, but as a value)",
    # ---- motion (animation library)
    "motion": "motion: HTML and SVG tags that can animate (motion.div, motion.span, motion.circle …)",
    "AnimatePresence": "motion: lets elements animate OUT before they are removed",
    "MotionConfig": "motion: settings for every animation inside it (here: respect reduced motion)",
    "useScroll": "motion: how far the page (or an element) has been scrolled, as live values",
    "useSpring": "motion: a value that follows another one with a springy delay",
    "useTransform": "motion: turns one live value into another (e.g. scroll 0→1 into a tilt 26°→0°)",
    "useMotionValue": "motion: a live value that changes without redrawing React",
    "useMotionValueEvent": "motion: run a function whenever a live value changes",
    "useInView": "motion: true while an element is visible in the window",
    "useReducedMotion": "motion: true if the person asked their computer for less motion",
    "animate": "motion: animate any number or value from code",
    "Transition": "motion: the type of a timing recipe (duration, easing, spring)",
    "Variants": "motion: the type of a set of named poses (hidden, show …)",
    "MotionValue": "motion: the type of a live, animatable value",
    # ---- other libraries
    "ReactLenis": "Lenis: the smooth-scrolling engine as a React component",
    "useLenis": "Lenis: the smooth-scrolling engine, to scroll or stop it from code",
    "Toaster": "Sonner: the corner area where toasts appear",
    "toast": "Sonner: the function that shows a toast",
    "Command": "cmdk: the searchable command-menu building blocks",
    "AlertDialog": "Radix UI: an accessible \"are you sure?\" dialog",
    "Dialog": "Radix UI: an accessible pop-up window",
    "DropdownMenu": "Radix UI: an accessible drop-down menu",
    "Tooltip": "Radix UI: an accessible tooltip (a label that appears on hover or focus)",
    "confetti": "canvas-confetti: draws bursts of confetti on a canvas",
    "LucideIcon": "Lucide: the type \"one icon component\"",
}


def ts_import(ctx: Context, line: str) -> str | None:
    s = line.strip()
    m = re.match(r"^import\s+'([^']+)';$", s)
    if m:
        src = m.group(1)
        if src.startswith("@fontsource"):
            return (f"Loads a font from the <code>{esc(src)}</code> package. The font files are bundled with the app, "
                    "so no request goes to Google Fonts and the page's Content-Security-Policy stays strict.")
        return f"Loads the stylesheet <code>{esc(src)}</code> so its styles apply to the whole app."
    m = re.match(r"^import\s+(type\s+)?(.+?)\s+from\s+'([^']+)';$", s)
    if not m:
        return None
    is_type, what, source = m.group(1), m.group(2), m.group(3)
    names = [n.strip() for n in re.sub(r"[{}]", "", what).split(",") if n.strip()]
    names = [n.replace("type ", "") for n in names]
    if source.startswith("."):
        resolved = resolve_ts(ctx.path, source)
        target = ctx.index.get(resolved)
        where = f'<a href="#{target}">{esc(source)}</a>' if target else f"<code>{esc(source)}</code>"
        kind = "the types (shapes of data) " if is_type else ""
        return f"Brings in {kind}{', '.join('<code>' + esc(n) + '</code>' for n in names)} from our own file {where}."
    if source == "lucide-react":
        return ("Brings in icons (small line drawings, each one a React component) from the Lucide icon set: "
                + ", ".join("<code>" + esc(n) + "</code>" for n in names) + ".")
    explained = []
    for name in names:
        meaning = TS_NAMES.get(name)
        explained.append(f"<code>{esc(name)}</code>" + (f" ({esc(meaning)})" if meaning else ""))
    return f"Brings in from the <code>{esc(source)}</code> library: " + "; ".join(explained) + "."


def resolve_ts(path: str, source: str) -> str:
    base = Path(path).parent
    parts = (base / source).as_posix().split("/")
    out: list[str] = []
    for p in parts:
        if p == "..":
            out.pop()
        elif p != ".":
            out.append(p)
    joined = "/".join(out)
    return joined[len("frontend/"):] if joined.startswith("frontend/") else joined


TYPE_WORDS = {
    "number": "a number", "string": "text", "boolean": "true or false", "null": "nothing (null)",
    "IsoDate": "a date written as text, e.g. \"2026-09-28\"", "IsoInstant": "a moment written as text, e.g. \"2026-09-28T10:15:00Z\"",
}


def describe_ts_type(t: str) -> str:
    t = t.strip().rstrip(";").strip()
    parts = [p.strip() for p in t.split("|")]
    out = []
    for p in parts:
        if p.endswith("[]"):
            inner = p[:-2]
            out.append(f"a list of {TYPE_WORDS.get(inner, '<code>' + esc(inner) + '</code>')}")
        elif p in TYPE_WORDS:
            out.append(TYPE_WORDS[p])
        elif p.startswith("'"):
            out.append(f"the exact text {esc(p)}")
        elif p.startswith("Record<"):
            out.append("a lookup table <code>" + esc(p) + "</code>")
        else:
            out.append(f"<code>{esc(p)}</code>")
    return " or ".join(out)


def ts_line(ctx: Context, n: int, line: str):
    s = line.strip()
    path = ctx.path
    if s.startswith("import "):
        r = ts_import(ctx, s)
        if r:
            return r
        if s.endswith("{"):
            return "Starts a list of names brought in from another file (the list continues on the next lines)."
    # inside a multi-line import list
    m = re.match(r"^(type\s+)?([A-Za-z]\w*),?$", s)
    if m and in_import_block(ctx, n):
        name = m.group(2)
        source = import_block_source(ctx, n)
        if source.endswith("api/types"):
            target = ctx.index.get("src/api/types")
            return f"…including the type <code>{esc(name)}</code> (defined in <a href=\"#{target}\">api/types.ts</a>)."
        if source == "lucide-react":
            if m.group(1):
                return f"…and the type <code>{esc(name)}</code> (\"one icon component\")."
            return f"…the icon <code>{esc(name)}</code>."
        meaning = TS_NAMES.get(name)
        return f"…and <code>{esc(name)}</code>" + (f" ({esc(meaning)})" if meaning else "") + "."
    if re.match(r"^\}\s+from\s+'[^']+';$", s):
        src = re.search(r"'([^']+)'", s).group(1)
        return f"Ends the list of names; they all come from <code>{esc(src)}</code>."
    if path.endswith("i18n/messages.ts"):
        r = messages_line(ctx, n, line)
        if r:
            return r
    r = ts_hook_line(s)
    if r:
        return r
    if path.endswith(".tsx"):
        r = ts_jsx_line(ctx, n, s)
        if r:
            return r
    if path.endswith("api/types.ts"):
        r = types_line(s)
        if r:
            return r
    if path.endswith("api/endpoints.ts"):
        r = endpoints_line(ctx, n, s)
        if r:
            return r
    return None


_MESSAGES: dict[str, str] | None = None


def message_text(key: str) -> str | None:
    """The words of a text-catalogue key such as 'login.submit' (from frontend/src/i18n/messages.ts)."""
    global _MESSAGES
    if _MESSAGES is None:
        root = Path(__file__).resolve().parents[2]
        lines = (root / "frontend/src/i18n/messages.ts").read_text(encoding="utf-8").split("\n")
        _MESSAGES = {k: v for k, _n, v in message_entries(lines)}
    return _MESSAGES.get(key)


T_REF = re.compile(r"\bt\.([A-Za-z_][\w]*(?:\.[A-Za-z_]\w*)*)")


def describe_texts(fragment: str) -> str:
    found = []
    for key in dict.fromkeys(T_REF.findall(fragment)):
        words = message_text(key)
        if words is None and "." in key:
            parent = key.rsplit(".", 1)[0]
            if message_text(parent) is not None:
                key, words = parent, message_text(parent)
        if words is not None:
            found.append(f"<code>t.{esc(key)}</code> = <q>{esc(words)}</q>")
        else:
            found.append(f"<code>t.{esc(key)}</code> (a group of texts chosen by a value)")
    if not found:
        return ""
    return " Text shown: " + "; ".join(found) + ". Change the words in <code>i18n/messages.ts</code>."


JSX_TAGS = {
    "th": "a column heading cell of a table", "td": "a table cell", "tr": "a table row", "h1": "the page's main title",
    "h2": "a section title", "h3": "a smaller title", "p": "a paragraph", "strong": "bold text", "span": "a piece of text",
    "option": "one choice in a drop-down list", "label": "a label for an input box", "li": "one item of a list",
    "button": "a button", "div": "a box", "em": "slanted (emphasised) text", "code": "text in code font",
    "Badge": "a small coloured label (our Badge component)", "Alert": "a coloured message box (our Alert component)",
    "Link": "a link to another page of the app", "a": "a link", "ul": "a bullet list", "ol": "a numbered list",
    "small": "small text", "q": "a quotation",
}


def ts_jsx_line(ctx: Context, n: int, s: str):
    m = re.match(r"^<([A-Za-z]\w*)([^>]*)>(.*)</\1>[)};,]*$", s)
    if m:
        tag, attrs, inner = m.group(1), m.group(2), m.group(3)
        what = JSX_TAGS.get(tag, f"a <code>&lt;{tag}&gt;</code> element")
        cls = re.search(r'className="([^"]+)"', attrs)
        style = f" styled by the CSS class(es) <code>{esc(cls.group(1))}</code> (see app.css)" if cls else ""
        texts = describe_texts(inner) or describe_texts(attrs)
        if not texts:
            texts = f" It shows: <code>{esc(inner.strip())}</code>." if inner.strip() else ""
        return f"Draws {what}{style}.{texts}"
    m = re.match(r"^\{(t\.[\w.]+(\([^)]*\))?)\}$", s)
    if m:
        return "Writes a text here." + describe_texts(s)
    return None


def ts_hook_line(s: str):
    m = re.match(r"^const \[(\w+), (set\w+)\] = useState(<[^>]*(?:<[^>]*>)?[^>]*>)?\((.*)\);$", s)
    if m:
        start = m.group(4) or "undefined"
        return (f"A piece of the component's <b>memory</b> (state) called <code>{m.group(1)}</code>, starting as "
                f"<code>{esc(start)}</code>. Calling <code>{m.group(2)}(newValue)</code> changes it, and React then "
                "redraws the screen with the new value.")
    known = {
        "useToast": "the pop-up message helper: <code>toast.success(...)</code>, <code>toast.error(...)</code>",
        "useConfirm": "the \"Are you sure?\" dialog: <code>await confirm(question)</code> gives true or false",
        "useNavigate": "a function that moves to another page, e.g. <code>navigate('/fees')</code>",
        "useUser": "the logged-in user (name, role, campus)",
        "useAuth": "the login state and the login/logout functions",
        "useLocation": "the current address (URL) of the page",
        "useParams": "the values inside the address, e.g. the id in /admissions/7",
    }
    m = re.match(r"^const (\{[^}]*\}|\w+) = (use\w+)\(\);$", s)
    if m and m.group(2) in known:
        return f"<code>{esc(m.group(1))}</code> = {known[m.group(2)]}."
    m = re.match(r"^const (\{[^}]*\}|\w+) = useLoad\(\(\) => (api\.[\w.]+)\(([^)]*)\), \[([^\]]*)\](, (.+))?\);$", s)
    if m:
        deps = m.group(4).strip()
        when = "once when the page opens" if not deps else f"when the page opens and again whenever <code>{esc(deps)}</code> changes"
        cond = f", but only while <code>{esc(m.group(6))}</code> is true" if m.group(6) else ""
        return (f"Loads data with <code>{esc(m.group(2))}({esc(m.group(3))})</code> {when}{cond}. "
                f"<code>{esc(m.group(1))}</code> then holds <code>data</code> (the answer), <code>error</code> "
                "(a message if it failed), <code>loading</code> (true while waiting) and <code>reload()</code>.")
    m = re.match(r"^(export )?function ([A-Z]\w*)\((.*)$", s)
    if m:
        exported = " <code>export</code> lets other files import it." if m.group(1) else ""
        return (f"Starts the React component <code>{m.group(2)}</code>: a function that returns what this part of the screen "
                f"looks like. Its inputs (props) are inside the brackets.{exported}")
    m = re.match(r"^(export )?(async )?function ([a-z]\w*)\((.*)$", s)
    if m:
        exported = " <code>export</code> lets other files use it." if m.group(1) else ""
        asyn = " It is <code>async</code>: it can <code>await</code> slow things like network requests." if m.group(2) else ""
        return f"Starts the function <code>{m.group(3)}</code>.{asyn}{exported}"
    return None


def in_import_block(ctx: Context, n: int) -> bool:
    for k in range(n - 2, -1, -1):
        t = ctx.lines[k].strip()
        if t.startswith("import ") and t.endswith("{"):
            return True
        if not re.match(r"^(type\s+)?[A-Za-z]\w*,?$", t):
            return False
    return False


def import_block_source(ctx: Context, n: int) -> str:
    """The library or file named on the closing line of a multi-line import list."""
    for k in range(n, min(len(ctx.lines), n + 80)):
        m = re.match(r"^\}\s+from\s+'([^']+)';$", ctx.lines[k].strip())
        if m:
            return m.group(1)
    return ""


def types_line(s: str):
    m = re.match(r"^export\s+interface\s+(\w+)\s*\{$", s)
    if m:
        return (f"Describes the shape of a <code>{m.group(1)}</code> object as it arrives from (or is sent to) the backend. "
                "Every line inside names one field and its type.")
    m = re.match(r"^export\s+type\s+(\w+)\s*=\s*(.*)$", s)
    if m:
        rest = m.group(2).rstrip(";")
        if rest:
            return f"<code>{m.group(1)}</code> is another name for {describe_ts_type(rest)}."
        return f"<code>{m.group(1)}</code> may only be one of the exact values listed on the next lines."
    m = re.match(r"^\|\s*('[^']+');?$", s)
    if m:
        return f"…or the value <code>{esc(m.group(1))}</code>."
    m = re.match(r"^(\w+)(\?)?:\s*(.+);$", s)
    if m:
        optional = " It may be left out." if m.group(2) else ""
        return f"Field <code>{m.group(1)}</code>: {describe_ts_type(m.group(3))}.{optional}"
    return None


def endpoints_line(ctx: Context, n: int, s: str):
    m = re.match(r"^(\w+):\s*\{$", s)
    if m:
        return f"The group <code>api.{m.group(1)}</code>: every backend call about {m.group(1)}."
    joined = s
    k = n
    while not re.search(r"\),?$", joined) and k < len(ctx.lines) and k < n + 3:
        joined += " " + ctx.lines[k].strip()
        k += 1
    m = re.match(r"^(\w+):\s*(async\s*)?\(([^)]*)\)(?::\s*[\w<>]+)?\s*=>", joined)
    r = re.search(r"request<([^>]+)>\('(\w+)',\s*([^,)]+)", joined)
    if m and r:
        verb, url = r.group(2), r.group(3).strip()
        url_html = esc(url.replace("`", "").replace("${", "{").replace("' + query(", " + ?query(").strip("'"))
        body = " The object after the URL is turned into JSON and sent as the request body." if joined.count(",") > 1 and verb in ("POST", "PUT") and "{" in joined.split(url, 1)[-1] else ""
        return (f"<code>{m.group(1)}({esc(m.group(3))})</code> sends <b>{verb}</b> <code>{url_html}</code> and expects "
                f"<code>{esc(r.group(1))}</code> back.{body}", k if k > n else None)
    m2 = re.match(r"^(\w+):\s*\(([^)]*)\)\s*=>\s*$", s)
    if m2:
        return None
    return None


# ---- messages.ts
def message_entries(lines: list[str]) -> list[tuple[str, int, str]]:
    """(key, line, text) for every entry of the text catalogue."""
    stack: list[str] = []
    entries = []
    for n, line in enumerate(lines, 1):
        s = line.strip()
        m = re.match(r"^(['\w.-]+|'[^']+'):\s*\{$", s)
        if m:
            stack.append(m.group(1).strip("'"))
            continue
        if re.match(r"^\}(\s*satisfies\s+.+?)?,?$", s) and stack:
            stack.pop()
            continue
        m = re.match(r"^(['\w.-]+|'[^']+'):\s*(.*?),?$", s)
        if m and stack:
            key = m.group(1).strip("'")
            value = m.group(2)
            if not value and n < len(lines):
                value = lines[n].strip().rstrip(",")  # Prettier put the text on the next line
            if value.startswith("'") or value.startswith('"'):
                text = value.strip(",").strip()[1:-1]
            elif value.startswith("["):
                text = value
            elif "=>" in value:
                text = value.split("=>", 1)[1].strip().strip(",")
            elif value.startswith("{"):
                text = value
            else:
                text = value
            full = ".".join(stack + [key]) if "'" not in m.group(1) else ".".join(stack) + f"['{key}']"
            entries.append((full, n, text))
    return entries


def messages_line(ctx: Context, n: int, line: str):
    s = line.strip()
    stack = messages_stack(ctx.lines, n)
    m = re.match(r"^(['\w.-]+|'[^']+'):\s*\{$", s)
    if m:
        key = m.group(1).strip("'")
        path = ".".join(stack + [key])
        return f"Starts the group <code>t.{esc(path)}</code>: the texts of that part of the app."
    m = re.match(r"^\}\s*satisfies\s+Record<(\w+),\s*string>,?$", s)
    if m:
        return (f"Ends the group. <code>satisfies Record&lt;{m.group(1)}, string&gt;</code> makes the compiler check that "
                f"there is a text for <em>every</em> possible {m.group(1)} value, so none can be forgotten.")
    m = re.match(r"^(['\w.-]+|'[^']+'):\s*(.+)$", s)
    if m and stack:
        key = m.group(1).strip("'")
        path = ".".join(stack + [key])
        value = m.group(2).rstrip(",")
        if value.startswith("'") or value.startswith('"'):
            return (f"<code>t.{esc(path)}</code> = the words <q>{esc(value[1:-1])}</q>. "
                    "Change the words between the quotes to change what users see.")
        if "=>" in value:
            params = re.match(r"\(([^)]*)\)", value)
            ps = params.group(1) if params else ""
            names = ", ".join(p.split(":")[0].strip() for p in ps.split(",") if p.strip())
            return (f"<code>t.{esc(path)}({esc(names)})</code> builds a sentence with blanks. The program fills "
                    f"<code>${{…}}</code> with the value(s) it passes in ({esc(names)}); you may change the words around them.")
        if value.startswith("["):
            return f"<code>t.{esc(path)}</code> is a list of texts; position 1 is used for 1, position 2 for 2, and so on."
        if value.startswith("{"):
            return f"<code>t.{esc(path)}</code>: a small group of texts on one line, one per status/kind."
    m = re.match(r"^(['\w.-]+|'[^']+'):$", s)
    if m and stack:
        path = ".".join(stack + [m.group(1).strip("'")])
        return f"<code>t.{esc(path)}</code> = the text on the next line (it was too long to fit on this one)."
    if s.startswith("`") or s.startswith("'") or s.startswith("("):
        return "(continues the sentence from the line above)"
    return None


def messages_stack(lines: list[str], n: int) -> list[str]:
    stack: list[str] = []
    for k in range(0, n - 1):
        s = lines[k].strip()
        m = re.match(r"^(['\w.-]+|'[^']+'):\s*\{$", s)
        if m:
            stack.append(m.group(1).strip("'"))
        elif re.match(r"^\}(\s*satisfies\s+.+?)?,?$", s) and stack:
            stack.pop()
    return stack


# =====================================================================
#  CSS
# =====================================================================
CSS_PROPS: dict[str, str] = {
    "margin": "space OUTSIDE the element's border (pushes neighbours away)",
    "margin-bottom": "space below the element", "margin-top": "space above the element",
    "margin-right": "space to the right of the element",
    "padding": "space INSIDE the element, between its border and its content",
    "border": "the line around the element (thickness, style, colour)",
    "border-left": "the line on the left edge only", "border-bottom": "the line under the element",
    "border-top-color": "colour of the top edge only", "border-color": "colour of the border line",
    "border-radius": "how rounded the corners are",
    "border-collapse": "table borders shared between neighbouring cells instead of doubled",
    "background": "the colour (or picture) behind the element",
    "color": "the text colour",
    "font-family": "which typeface (font) to use", "font-size": "how big the letters are",
    "font-weight": "how thick the letters are (400 normal, 600 semi-bold, 700 bold)",
    "font": "font settings; <code>inherit</code> = same as the surrounding text",
    "font-variant-numeric": "tabular-nums = every digit the same width, so columns of numbers line up",
    "line-height": "the height of each line of text (1.5 = one and a half times the letter size)",
    "letter-spacing": "extra space between letters",
    "text-align": "left, centre or right alignment of text",
    "text-decoration": "underline or no underline",
    "white-space": "how spaces and line breaks are shown (nowrap = never break the line; pre = keep them exactly)",
    "vertical-align": "where content sits vertically inside a table cell",
    "display": "how the element is laid out (block, inline, flex, grid ...)",
    "grid-template-columns": "the columns of a grid layout and how wide each is",
    "gap": "space between the items of a flex/grid layout",
    "flex-direction": "whether flex items go in a row or a column",
    "flex-wrap": "allow items to move onto a new line when there is no room",
    "align-items": "how flex/grid items line up across (e.g. centre vertically)",
    "justify-content": "how flex items are spread along the main direction",
    "place-items": "centres the content both ways inside a grid",
    "position": "how the element is placed (fixed = stays in the same place on the screen)",
    "inset": "distance from all four edges (0 = cover the whole screen)",
    "right": "distance from the right edge", "bottom": "distance from the bottom edge",
    "z-index": "which elements are drawn on top (bigger number = on top)",
    "width": "how wide the element is", "height": "how tall the element is",
    "min-width": "the element is never narrower than this", "max-width": "the element is never wider than this",
    "min-height": "the element is never shorter than this",
    "overflow": "what to do when the content does not fit (hidden = cut it off)",
    "overflow-x": "what to do when content is too wide (auto = add a sideways scrollbar)",
    "box-shadow": "a soft shadow around the element, making it look raised",
    "cursor": "the mouse pointer's shape (pointer = a hand, meaning \"clickable\")",
    "opacity": "see-through-ness (1 = solid, 0 = invisible)",
    "outline": "a highlight ring (used to show keyboard focus)",
    "outline-offset": "the gap between the element and its focus ring",
    "transition": "animate changes smoothly over the given time",
    "animation": "run a named animation (here: spinning forever)",
    "transform": "rotate / move / scale the element",
    "box-sizing": "border-box = width includes padding and border (much easier to reason about)",
    "list-style": "the bullets of a list",
    "backdrop-filter": "blurs whatever is BEHIND the element (the frosted-glass effect)",
    "-webkit-backdrop-filter": "the same frosted-glass blur, for Safari",
    "filter": "a visual effect on the element itself (blur, brightness …)",
    "animation-timeline": "what drives the animation: <code>view()</code> = how far the element has scrolled into view, instead of the clock",
    "animation-range": "which part of the scroll journey the animation happens in",
    "animation-delay": "wait this long before the animation starts",
    "animation-direction": "play the animation forwards or backwards",
    "animation-duration": "how long one run of the animation takes",
    "animation-play-state": "pause or play the animation",
    "mask-image": "a stencil: where it is black the element shows, where transparent it fades away",
    "-webkit-mask-image": "the same stencil, for Safari",
    "mask": "a stencil that hides parts of the element",
    "-webkit-mask": "the same stencil, for Safari",
    "-webkit-mask-composite": "how two stencils combine, for Safari",
    "transform-origin": "the point the element turns or grows around",
    "translate": "moves the element (x, y) without affecting the layout around it",
    "rotate": "turns the element",
    "scale": "makes the element bigger or smaller",
    "isolation": "isolate = its own layer, so its children's z-index cannot leak out",
    "aspect-ratio": "keeps width and height in this proportion (1 = a square)",
    "inset": "distance from all four edges (0 = cover the whole parent)",
    "left": "distance from the left edge", "top": "distance from the top edge",
    "grid-template-columns": "the columns of a grid layout and how wide each is",
    "grid-column": "how many grid columns the element spans",
    "justify-items": "how grid items line up horizontally in their cell",
    "place-content": "centres the content of a grid both ways",
    "flex": "how much a flex item grows or shrinks (none = keep its own size)",
    "text-wrap": "balance = even line lengths for headings; pretty = no lonely last word",
    "text-transform": "uppercase = shown in capital letters",
    "text-decoration-thickness": "how thick an underline is",
    "text-underline-offset": "how far below the letters the underline sits",
    "text-overflow": "ellipsis = cut long text off with …",
    "overflow-wrap": "anywhere = long words may break onto the next line",
    "user-select": "none = the text cannot be highlighted by dragging",
    "pointer-events": "none = clicks pass straight through the element",
    "scrollbar-width": "thin = a slimmer scrollbar",
    "scrollbar-color": "colours of the scrollbar's handle and track",
    "scrollbar-gutter": "stable = always keep room for the scrollbar, so the page never jumps sideways",
    "overscroll-behavior": "contain = scrolling inside stops at the edge instead of scrolling the page behind",
    "scroll-snap-type": "makes a scrolling row settle neatly on an item",
    "scroll-snap-align": "which edge of the item the row settles on",
    "touch-action": "which finger gestures the browser handles itself",
    "will-change": "a hint that this will animate, so the browser can prepare",
    "accent-color": "the colour of checkboxes and radio buttons",
    "appearance": "none = remove the browser's own look (so we can draw our own)",
    "background-image": "a picture or gradient behind the element",
    "background-size": "how big the background picture is",
    "background-position": "where the background picture sits",
    "background-repeat": "whether the background picture repeats",
    "background-clip": "text = the background shows only through the letters (gradient text)",
    "-webkit-background-clip": "the same, for Safari",
    "mix-blend-mode": "how the element's colours mix with what is behind it",
    "color-scheme": "which themes (light, dark) the page supports; decides which half of light-dark() is used",
    "resize": "whether the person can drag the box bigger",
    "vertical-align": "where content sits vertically",
    "font-feature-settings": "switches on optional letter shapes built into the font",
    "font-style": "italic = slanted letters",
    "-webkit-font-smoothing": "smoother-looking letters on Mac screens",
    "-moz-osx-font-smoothing": "the same, for Firefox on Mac",
    "-webkit-text-size-adjust": "stops phones from enlarging text on their own",
    "text-size-adjust": "stops phones from enlarging text on their own",
    "clip-path": "cuts the element to a shape; inset(50%) cuts it to nothing (hidden but readable by screen readers)",
    "transition-behavior": "lets properties like display take part in transitions",
    "transition-property": "which properties animate when they change",
    "transition-duration": "how long a change takes to animate",
    "content": "the text or picture of a ::before / ::after helper (\"\" = an empty decorative box)",
    "stroke": "the colour of an SVG line", "stroke-width": "how thick an SVG line is",
    "stroke-dasharray": "draws an SVG line as dashes", "fill": "the colour inside an SVG shape",
    "fill-opacity": "how see-through the inside of an SVG shape is",
    "syntax": "the kind of value a registered custom property holds",
    "initial-value": "the starting value of a registered custom property",
    "inherits": "whether children get the value too",
}


def css_value(value: str) -> str:
    value = value.rstrip(";")
    words = []
    for var in re.findall(r"var\((--[\w-]+)\)", value):
        words.append(f"<code>{var}</code> from theme.css")
    note = f" (uses {', '.join(words)})" if words else ""
    return f"<code>{esc(value)}</code>{note}"


def css_value_continues(ctx: Context, n: int) -> bool:
    """True if line n is the 2nd, 3rd … line of a property whose value was split over several lines."""
    for k in range(n - 2, -1, -1):
        prev = ctx.lines[k].strip()
        if not prev or prev.startswith("/*"):
            continue
        if re.match(r"^[a-z-]+:\s*$", prev):
            return True
        if prev.endswith(",") and not prev.endswith("{"):
            continue
        return False
    return False


def css_line(ctx: Context, n: int, line: str):
    s = line.strip()
    m = re.match(r"^@keyframes\s+([\w-]+)\s*\{(.*)\}$", s)
    if m:
        return (f"<b>@keyframes {esc(m.group(1))}</b>: a one-line animation. <code>{esc(m.group(2).strip())}</code> "
                "lists the poses; the browser moves smoothly between them.")
    m = re.match(r"^([a-z-]+):\s*$", s)
    if m:
        meaning = CSS_PROPS.get(m.group(1))
        return (f"<code>{m.group(1)}</code>" + (f": {meaning}" if meaning else "")
                + ". Its value is long, so it continues on the next lines.")
    if css_value_continues(ctx, n):
        return f"…part of that value: <code>{esc(s.rstrip(';,'))}</code>" + (" (the last part)." if s.endswith(";") else ", and…")
    m = re.match(r"^(--[\w-]+):\s*(.+);(\s*/\*\s*(.*?)\s*\*/)?$", s)
    if m:
        meaning = f" – {esc(m.group(4))}" if m.group(4) else ""
        return (f"Design token <code>{m.group(1)}</code> = <code>{esc(m.group(2))}</code>{meaning}. Anything written as "
                f"<code>var({m.group(1)})</code> in app.css uses this value.")
    m = re.match(r"^([a-z-]+):\s*(.+?);?\s*$", s)
    if m and not s.endswith("{") and not s.startswith("@"):
        prop = m.group(1)
        meaning = CSS_PROPS.get(prop)
        if meaning:
            return f"<code>{prop}</code>: {meaning} → {css_value(m.group(2))}."
        return f"<code>{prop}</code> → {css_value(m.group(2))}."
    m = re.match(r"^(.+?)\s*\{\s*(.*?)\s*\}$", s)
    if m and not s.startswith("@"):
        return f"One-line rule: {describe_selector(m.group(1))} gets <code>{esc(m.group(2))}</code>."
    if s.endswith("{"):
        sel = s[:-1].strip()
        if sel.startswith("@media (prefers-color-scheme: dark)"):
            return "<b>@media (prefers-color-scheme: dark)</b>: the rules inside apply only when the computer/phone is set to dark mode."
        if "prefers-reduced-motion" in sel:
            return "<b>" + esc(sel) + "</b>: applies according to the person's \"reduce motion\" setting in their operating system."
        if sel.startswith("@media print"):
            return "<b>@media print</b>: these rules apply only when the page is printed."
        if sel.startswith("@media"):
            return f"<b>{esc(sel)}</b>: the rules inside apply only on screens matching this condition (here: narrow screens such as phones)."
        if sel.startswith("@supports"):
            return f"<b>{esc(sel)}</b>: the rules inside apply only in browsers that understand this feature; older browsers simply skip them."
        if sel.startswith("@property"):
            return f"<b>{esc(sel)}</b>: registers the custom property <code>{esc(sel.split()[1])}</code> with a type, so the browser can animate it smoothly."
        if sel.startswith("@keyframes"):
            return f"<b>{esc(sel)}</b>: defines an animation named <code>{esc(sel.split()[1])}</code>."
        if sel == ":root":
            return "<code>:root</code> = the whole page. Variables defined here can be used everywhere."
        return f"Styles for {describe_selector(sel)}:"
    m = re.match(r"^(.+),$", s)
    if m:
        return f"{describe_selector(m.group(1))}, and…"
    return None


def describe_selector(sel: str) -> str:
    sel = sel.strip()
    parts = []
    for piece in sel.split(","):
        piece = piece.strip()
        extra = ""
        if ":hover" in piece:
            extra = " when the mouse is over it"
        elif ":focus-visible" in piece or ":focus" in piece:
            extra = " when it has keyboard focus"
        elif ":disabled" in piece:
            extra = " when it is disabled"
        elif "::before" in piece or "::after" in piece:
            extra = " (and its invisible before/after helpers)"
        parts.append(f"<code>{esc(piece)}</code>{extra}")
    return " and ".join(parts)


# =====================================================================
#  SQL
# =====================================================================
SQL_TYPES = [
    (r"BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY", "a whole number the database fills in automatically (1, 2, 3 …); it is the row's unique id (PRIMARY KEY)"),
    (r"BIGINT", "a whole number (up to 9 quintillion)"),
    (r"INT", "a whole number"),
    (r"VARCHAR\((\d+)\)", "text of at most {0} characters"),
    (r"CHAR\((\d+)\)", "text of exactly {0} characters"),
    (r"NUMERIC\((\d+),(\d+)\)", "an exact decimal number with {0} digits in total, {1} after the point"),
    (r"BOOLEAN", "true or false"),
    (r"DATE", "a calendar date"),
    (r"TIMESTAMP WITH TIME ZONE", "an exact moment (date + time + time zone)"),
]


def sql_line(ctx: Context, n: int, line: str):
    s = line.strip()
    m = re.match(r"^CREATE TABLE (\w+) \($", s)
    if m:
        return (f"<b>CREATE TABLE {m.group(1)}</b>: makes a new table called <code>{m.group(1)}</code>. Each line until "
                "<code>);</code> describes one column (or one rule).")
    if s == ");":
        return "End of the table definition."
    m = re.match(r"^CREATE INDEX (\w+) ON (\w+) \((.+)\);$", s)
    if m:
        return (f"<b>Index</b> <code>{m.group(1)}</code>: like the index at the back of a book, it lets the database find rows of "
                f"<code>{m.group(2)}</code> by <code>{esc(m.group(3))}</code> quickly without reading every row.")
    m = re.match(r"^CONSTRAINT (\w+) UNIQUE \((.+)\)$", s)
    if m:
        return (f"<b>Rule</b> <code>{m.group(1)}</code>: no two rows may have the same combination of "
                f"<code>{esc(m.group(2))}</code>. The database refuses any insert that would break this.")
    m = re.match(r"^CONSTRAINT (\w+) CHECK \((.+)\)$", s)
    if m:
        return f"<b>Rule</b> <code>{m.group(1)}</code>: every row must satisfy <code>{esc(m.group(2))}</code>, otherwise the database refuses it."
    m = re.match(r"^(\w+)\s+([A-Z].*?)(,)?(\s*--\s*(.*))?$", s)
    if m:
        col, rest, comment = m.group(1), m.group(2).rstrip(","), m.group(5)
        return describe_column(col, rest, comment)
    return None


def describe_column(col: str, rest: str, comment: str | None) -> str:
    kind = ""
    for pattern, words in SQL_TYPES:
        m = re.match(pattern, rest)
        if m:
            kind = words.format(*m.groups())
            rest_after = rest[m.end():]
            break
    else:
        rest_after = rest
    rules = []
    if "PRIMARY KEY" in rest_after:
        rules.append("it is the row's unique id (PRIMARY KEY)")
    if "NOT NULL" in rest_after:
        rules.append("it must always have a value (NOT NULL)")
    if re.search(r"\bUNIQUE\b", rest_after):
        rules.append("no two rows may share the same value (UNIQUE)")
    d = re.search(r"DEFAULT (\S+)", rest_after)
    if d:
        rules.append(f"if nothing is given it starts as <code>{esc(d.group(1))}</code>")
    r = re.search(r"REFERENCES (\w+) \((\w+)\)", rest_after)
    if r:
        rules.append(f"it must match an existing <code>{r.group(2)}</code> in the <code>{r.group(1)}</code> table (a <em>foreign key</em>, a link between tables)")
    if "ON DELETE CASCADE" in rest_after:
        rules.append("when that linked row is deleted, this row is deleted too (CASCADE)")
    text = f"Column <code>{col}</code>: {kind}"
    if rules:
        text += "; " + "; ".join(rules)
    text += "."
    if comment:
        text += f" <span class=\"why\">Note: {esc(comment)}</span>"
    return text


# =====================================================================
#  YAML, XML, Dockerfile, git files
# =====================================================================
def yaml_path(lines: list[str], n: int) -> list[str]:
    path: list[tuple[int, str]] = []
    for k in range(0, n):
        raw = lines[k]
        if not raw.strip() or raw.strip().startswith("#") or raw.strip().startswith("-"):
            continue
        ind = len(raw) - len(raw.lstrip())
        key = raw.strip().split(":", 1)[0]
        while path and path[-1][0] >= ind:
            path.pop()
        path.append((ind, key))
    return [p[1] for p in path]


def yaml_line(ctx: Context, n: int, line: str):
    s = line.strip()
    comment = ""
    if " #" in s:
        s, comment = s.split(" #", 1)
        s = s.strip()
        comment = comment.strip()
    if s.startswith("- "):
        item = s[2:]
        if ":" in item:
            k, v = item.split(":", 1)
            return f"Starts a new item in the list; its <code>{esc(k.strip())}</code> is <code>{esc(v.strip())}</code>."
        return f"A list item: <code>{esc(item)}</code>."
    m = re.match(r"^([\w.-]+):\s*(.*)$", s)
    if not m:
        return None
    path = ".".join(yaml_path(ctx.lines, n))
    value = m.group(2)
    why = f" <span class=\"why\">Note: {esc(comment)}</span>" if comment else ""
    if not value:
        return f"Group <code>{esc(path)}</code>: the settings indented below belong to it.{why}"
    env = re.match(r"^\$\{(\w+):(.*)\}$", value)
    if env:
        return (f"Setting <code>{esc(path)}</code> = the environment variable <code>{env.group(1)}</code> if it is set, "
                f"otherwise <code>{esc(env.group(2)) or '(empty)'}</code>.{why}")
    return f"Setting <code>{esc(path)}</code> = <code>{esc(value)}</code>.{why}"


POM_TAGS = {
    "groupId": "the organisation that publishes the library",
    "artifactId": "the library's name",
    "version": "which version",
    "scope": "when it is needed (runtime = only when running; test = only for tests; import = take its version list)",
    "type": "what kind of file it is (pom = a list of versions)",
    "modelVersion": "the version of the pom.xml format itself",
    "name": "a human-readable name for the project",
    "description": "a one-line description of the project",
    "relativePath": "empty = download the parent from the internet instead of looking in a folder",
    "java.version": "the Java version the code is compiled for",
    "project.build.sourceEncoding": "the text encoding of the source files",
}


def xml_line(ctx: Context, n: int, line: str):
    s = line.strip()
    m = re.match(r"^<([\w.]+)>(.*)</\1>$", s)
    if m:
        tag, value = m.group(1), m.group(2)
        meaning = POM_TAGS.get(tag)
        return f"<code>&lt;{tag}&gt;</code> = <code>{esc(value) or '(empty)'}</code>" + (f": {meaning}." if meaning else ".")
    m = re.match(r"^<([\w.]+)/>$", s)
    if m:
        meaning = POM_TAGS.get(m.group(1))
        return f"<code>&lt;{m.group(1)}/&gt;</code> (empty)" + (f": {meaning}." if meaning else ".")
    m = re.match(r"^</([\w.]+)>$", s)
    if m:
        return f"End of <code>&lt;{m.group(1)}&gt;</code>."
    m = re.match(r"^<([\w.]+)>$", s)
    if m:
        words = {"dependency": "One library the backend needs:", "dependencies": "The list of libraries the backend needs.",
                 "plugin": "One build tool (plugin):", "plugins": "The list of build tools.", "build": "How to build the project.",
                 "properties": "Named values used elsewhere in this file.", "parent": "The parent project whose defaults we inherit:",
                 "dependencyManagement": "Version rules for libraries (without adding them).",
                 "project": "The whole project description starts here."}
        return words.get(m.group(1), f"Starts <code>&lt;{m.group(1)}&gt;</code>.")
    return None


DOCKER = {
    "FROM": "starts from a ready-made image",
    "WORKDIR": "switches to (and creates) this folder inside the image",
    "COPY": "copies files from the project into the image",
    "RUN": "runs a command while building the image",
    "EXPOSE": "documents which port the program inside listens on",
    "ENV": "sets environment variables for the program",
    "ENTRYPOINT": "the command that runs when the container starts",
    "USER": "from here on, run as this (non-root) user",
}


def docker_line(ctx: Context, n: int, line: str):
    s = line.strip()
    word = s.split(" ", 1)[0]
    if word in DOCKER:
        extra = ""
        if word == "FROM" and " AS " in s:
            extra = f" and names this stage <code>{esc(s.split(' AS ')[1])}</code>"
        return f"<b>{word}</b>: {DOCKER[word]}{extra}: <code>{esc(s[len(word):].strip())}</code>."
    if s.startswith("STORAGE_ROOT") or s.startswith("SPRING_"):
        return "…continues the ENV line above."
    return None


def gitignore_line(ctx: Context, n: int, line: str):
    s = line.strip()
    if s.startswith("!"):
        return f"…but DO keep <code>{esc(s[1:])}</code> in git (the ! makes an exception)."
    return f"git ignores (never uploads) anything matching <code>{esc(s)}</code>."


def gitattributes_line(ctx: Context, n: int, line: str):
    s = line.strip()
    pattern, _, attrs = s.partition(" ")
    words = []
    if "binary" in attrs:
        words.append("treat as binary (never change its bytes)")
    if "eol=lf" in attrs:
        words.append("store with LF (Unix) line endings")
    if "eol=crlf" in attrs:
        words.append("store with CRLF (Windows) line endings")
    if "text=auto" in attrs:
        words.append("let git detect text files")
    return f"Files matching <code>{esc(pattern)}</code>: {', '.join(words)}."


def env_line(ctx: Context, n: int, line: str):
    s = line.strip()
    if "=" in s:
        k, v = s.split("=", 1)
        return f"Environment variable <code>{esc(k)}</code> (example value <code>{esc(v)}</code>). docker-compose.yml passes it to the backend."
    return None
