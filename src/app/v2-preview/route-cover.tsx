import type { CoverId } from "./data";

/** Original SVG postcards. No remote image requests, uploads or image APIs. */
export function RouteCover({
  scene,
  className = "",
  fit = "cover",
}: {
  scene: CoverId;
  className?: string;
  fit?: "cover" | "contain";
}) {
  if (scene === "boarding" || scene === "luggage" || scene === "airport-sign") {
    return <AirportGraphic scene={scene} className={className} fit={fit} />;
  }
  const night = scene === "night";
  const sunset = scene === "sunset";
  const sky = night
    ? "#173b50"
    : sunset
      ? "#efb18f"
      : scene === "town"
        ? "#d6e9d3"
        : "#bce2e8";
  const sea = night ? "#1f5c6b" : sunset ? "#d78e7f" : "#72b9be";
  return (
    <svg
      className={className}
      viewBox="0 0 480 520"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio={`xMidYMid ${fit === "contain" ? "meet" : "slice"}`}
    >
      <rect width="480" height="520" fill={sky} />
      <circle
        cx={night ? 366 : 360}
        cy={night ? 96 : 150}
        r={night ? 35 : 72}
        fill={night ? "#ffe5a5" : "#fff1c6"}
      />
      <path
        d="M0 278 Q80 180 160 258 Q250 160 335 250 Q420 180 480 244 V520 H0Z"
        fill={night ? "#244d59" : "#8ab6aa"}
        opacity=".65"
      />
      <path
        d="M0 326 Q100 248 230 307 Q360 230 480 305 V520 H0Z"
        fill={night ? "#20434d" : "#669f98"}
      />
      <rect y="352" width="480" height="168" fill={sea} />
      {[382, 415, 448, 476].map((y, i) => (
        <path
          key={y}
          d={`M${25 + i * 25} ${y} h${95 + i * 30} m50 0 h100`}
          stroke="white"
          strokeWidth="2"
          opacity=".18"
        />
      ))}
      {scene === "terminal" ? (
        <>
          <path d="M-20 284 L235 220 L500 284 L500 315 H-20Z" fill="#f1f5ed" />
          <path d="M-20 294 H500 V421 H-20Z" fill="#d7e7e2" />
          {Array.from({ length: 10 }, (_, i) => (
            <path
              key={i}
              d={`M${i * 53} 300 V417`}
              stroke="#9bbab6"
              strokeWidth="8"
            />
          ))}
          <path d="M0 324 H480 M0 370 H480" stroke="#91b5b5" strokeWidth="4" />
          <path d="M0 428 H480 V520 H0Z" fill="#c4c9bb" />
          <path
            d="M30 479 H450"
            stroke="#f9f5de"
            strokeWidth="4"
            strokeDasharray="38 20"
          />
          <g transform="translate(115 145) rotate(-12)">
            <path
              d="M0 0 L111 9 L193 -35 L215 -32 L164 14 L261 29 L267 42 L150 36 L121 80 L103 80 L119 33 L17 18Z"
              fill="#f8f7e9"
            />
            <path d="M18 17 L0 -14 L15 -14 L52 20" fill="#287e7c" />
            <path d="M243 28 L265 34" stroke="#1b5c62" strokeWidth="4" />
          </g>
        </>
      ) : scene === "bridge" ? (
        <>
          <path d="M-30 444 L510 306 L510 338 L-30 478Z" fill="#e8d8af" />
          <path
            d="M128 438 V186 H142 V435 M351 379 V149 H366 V375"
            stroke="#f3eee0"
            strokeWidth="12"
          />
          <path
            d="M-10 438 L135 192 L358 153 L500 310 M135 192 L358 362 M135 192 L0 440 M358 153 L200 407"
            stroke="#f8f5e5"
            strokeWidth="3"
          />
          <path d="M-10 455 L510 322" stroke="#7c8d7f" strokeWidth="5" />
        </>
      ) : scene === "town" ? (
        <>
          {[
            [-15, 262, 93, 160, "#efc59c"],
            [86, 213, 105, 215, "#f2ddba"],
            [198, 250, 100, 182, "#bdd0b8"],
            [305, 187, 110, 245, "#edc39e"],
            [424, 238, 85, 194, "#e3dfbe"],
          ].map(([x, y, w, h, c], i) => (
            <g key={i}>
              <rect x={x} y={y} width={w} height={h} fill={String(c)} />
              {Array.from({ length: 4 }, (_, j) => (
                <path
                  key={j}
                  d={`M${Number(x) + 18} ${Number(y) + 24 + j * 36} h${Number(w) - 36}`}
                  stroke="#6b8e85"
                  strokeWidth="14"
                  strokeDasharray="12 12"
                />
              ))}
            </g>
          ))}
          <path d="M0 431 H480 V520 H0Z" fill="#d6c7aa" />
          <path
            d="M0 479 H480"
            stroke="#f9f2dc"
            strokeWidth="4"
            strokeDasharray="45 24"
          />
          <g transform="translate(162 398)">
            <rect width="111" height="58" rx="5" fill="#267d70" />
            <path d="M17 7 H89 V29 H17Z" fill="#bdded5" />
            <circle cx="25" cy="59" r="12" fill="#355451" />
            <circle cx="87" cy="59" r="12" fill="#355451" />
          </g>
        </>
      ) : (
        <>
          <g fill={night ? "#112d41" : sunset ? "#a56e6b" : "#448e98"}>
            <path d="M-10 356 V249 H56 V356 M63 356 V227 H119 V356 M127 356 V273 H182 V356 M199 356 V156 L217 118 L236 156 V356 M247 356 V214 H288 V356 M299 356 V238 H350 V356 M365 356 V187 H411 V356 M423 356 V257 H495 V356" />
            <path d="M377 189 L388 124 L400 189" />
          </g>
          <g
            stroke={night ? "#f2ce8b" : "#b2d8d4"}
            strokeWidth="3"
            opacity=".65"
          >
            <path
              d="M17 270 V330 M39 270 V330 M81 246 V335 M103 246 V335 M210 177 V336 M223 177 V336 M260 238 V337 M274 238 V337 M379 210 V337 M398 210 V337"
              strokeDasharray="5 10"
            />
          </g>
          <g transform="translate(290 410)">
            <path d="M-32 19 H63 L48 38 H-12Z" fill="#faf0d4" />
            <path
              d="M5 18 V-39 L47 14Z"
              fill={sunset ? "#f7deba" : "#f4c16d"}
            />
            <path d="M0 18 V-29 L-27 18Z" fill="#fff7df" />
          </g>
        </>
      )}
      <text
        x="26"
        y="41"
        fill={night ? "#d8e9e5" : "#285d61"}
        fontFamily="sans-serif"
        fontSize="11"
        letterSpacing="4"
      >
        FAREENOUGH · ON THE WAY
      </text>
      <text
        x="26"
        y="489"
        fill={night ? "#d8e9e5" : "#285d61"}
        fontFamily="sans-serif"
        fontSize="11"
        letterSpacing="3"
      >
        {scene === "terminal"
          ? "HKG / NEXT STOP, HOME"
          : "HONG KONG / 同路風景"}
      </text>
    </svg>
  );
}

function AirportGraphic({
  scene,
  className,
  fit,
}: {
  scene: "boarding" | "luggage" | "airport-sign";
  className: string;
  fit: "cover" | "contain";
}) {
  const sign = scene === "airport-sign";
  return (
    <svg
      className={className}
      viewBox="0 0 480 520"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio={`xMidYMid ${fit === "contain" ? "meet" : "slice"}`}
    >
      <rect
        width="480"
        height="520"
        fill={sign ? "#1e524c" : scene === "boarding" ? "#e9e8d7" : "#cde3d6"}
      />
      <text
        x="28"
        y="42"
        fill={sign ? "#b6d9ca" : "#557d69"}
        fontFamily="sans-serif"
        fontSize="11"
        letterSpacing="3"
      >
        FAREENOUGH / HONG KONG
      </text>
      {scene === "boarding" ? (
        <>
          <circle cx="398" cy="100" r="73" fill="#f4cd78" />
          <g transform="rotate(-8 240 290)">
            <rect
              x="42"
              y="125"
              width="396"
              height="326"
              rx="15"
              fill="#fffdf2"
            />
            <path
              d="M42 140 Q42 125 57 125 H423 Q438 125 438 140 V195 H42Z"
              fill="#267366"
            />
            <text
              x="65"
              y="158"
              fill="#d6e5ca"
              fontFamily="sans-serif"
              fontSize="11"
              letterSpacing="3"
            >
              A LITTLE COMPANY
            </text>
            <text
              x="65"
              y="181"
              fill="#fff9df"
              fontFamily="sans-serif"
              fontSize="17"
              fontWeight="700"
            >
              同路登機證
            </text>
            <text
              x="64"
              y="257"
              fill="#224f44"
              fontFamily="sans-serif"
              fontSize="47"
              fontWeight="700"
            >
              HKG
            </text>
            <path
              d="M209 240 H329 M313 225 L330 240 L313 255"
              stroke="#d9ad58"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <text
              x="65"
              y="285"
              fill="#829780"
              fontFamily="sans-serif"
              fontSize="12"
              letterSpacing="2"
            >
              NEXT STOP / 屋企見
            </text>
            <path
              d="M42 322 H438"
              stroke="#d1dac5"
              strokeWidth="2"
              strokeDasharray="6 6"
            />
            <circle cx="42" cy="322" r="12" fill="#e9e8d7" />
            <circle cx="438" cy="322" r="12" fill="#e9e8d7" />
            <text
              x="66"
              y="359"
              fill="#6b8873"
              fontFamily="sans-serif"
              fontSize="11"
              letterSpacing="2"
            >
              GOOD COMPANY, LESS FARE.
            </text>
            <text
              x="66"
              y="388"
              fill="#2b6255"
              fontFamily="sans-serif"
              fontSize="18"
              fontWeight="600"
            >
              一齊返屋企。
            </text>
            {Array.from({ length: 19 }, (_, i) => (
              <path
                key={i}
                d={`M${66 + i * 12} 405 V428`}
                stroke="#81a291"
                strokeWidth={i % 3 === 0 ? 5 : 2}
              />
            ))}
          </g>
        </>
      ) : scene === "luggage" ? (
        <>
          <circle cx="110" cy="207" r="102" fill="#edf0d8" />
          <path d="M-20 435 Q200 367 500 417 V520 H0Z" fill="#a4c9b2" />
          <path
            d="M330 110 C470 180 302 215 369 305"
            stroke="#80aa93"
            strokeWidth="3"
            strokeDasharray="7 10"
          />
          <g transform="rotate(8 240 300)">
            <path
              d="M196 180 V145 Q196 127 215 127 H254 Q272 127 272 145 V180"
              stroke="#4c7562"
              strokeWidth="13"
            />
            <rect
              x="132"
              y="178"
              width="210"
              height="245"
              rx="32"
              fill="#e7bc65"
            />
            <rect
              x="139"
              y="181"
              width="195"
              height="234"
              rx="27"
              stroke="#f4d58a"
              strokeWidth="4"
            />
            {[179, 216, 253, 290].map((x) => (
              <path
                key={x}
                d={`M${x} 220 V376`}
                stroke="#cfa64f"
                strokeWidth="6"
                strokeLinecap="round"
              />
            ))}
            <rect
              x="234"
              y="238"
              width="78"
              height="108"
              rx="7"
              transform="rotate(12 234 238)"
              fill="#fff4d6"
            />
            <circle cx="257" cy="261" r="4" fill="#e4bf79" />
            <text
              x="249"
              y="293"
              fill="#497763"
              fontFamily="sans-serif"
              fontSize="16"
              fontWeight="700"
              transform="rotate(12 249 293)"
            >
              HKG
            </text>
            <circle cx="177" cy="428" r="13" fill="#426f5b" />
            <circle cx="298" cy="428" r="13" fill="#426f5b" />
          </g>
          <text
            x="37"
            y="93"
            fill="#366c55"
            fontFamily="sans-serif"
            fontSize="25"
            fontWeight="650"
          >
            行李唔多，
          </text>
          <text
            x="37"
            y="126"
            fill="#366c55"
            fontFamily="sans-serif"
            fontSize="25"
            fontWeight="650"
          >
            同路啱啱好。
          </text>
        </>
      ) : (
        <>
          <path d="M0 123 H480 M0 376 H480" stroke="#3a6b60" strokeWidth="2" />
          <path
            d="M0 440 L480 280 M-20 497 L480 337"
            stroke="#2c6258"
            strokeWidth="20"
          />
          <rect
            x="31"
            y="151"
            width="418"
            height="215"
            rx="13"
            fill="#173c36"
          />
          <rect
            x="48"
            y="167"
            width="384"
            height="181"
            rx="6"
            stroke="#61927b"
          />
          <path
            d="M351 204 V260 M327 239 L351 262 L375 239"
            stroke="#f2cb72"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text
            x="72"
            y="211"
            fill="#f4da9f"
            fontFamily="sans-serif"
            fontSize="13"
            letterSpacing="5"
          >
            HKG · DEPARTURES
          </text>
          <text
            x="72"
            y="264"
            fill="#fff3cf"
            fontFamily="sans-serif"
            fontSize="38"
            fontWeight="700"
          >
            同路出發
          </text>
          <text
            x="72"
            y="310"
            fill="#b6d8bb"
            fontFamily="sans-serif"
            fontSize="16"
            letterSpacing="1"
          >
            NEXT JOURNEY, TOGETHER.
          </text>
          <circle cx="400" cy="79" r="15" fill="#f2cb72" />
          <path
            d="M58 410 H219"
            stroke="#6b9a7e"
            strokeWidth="3"
            strokeDasharray="4 10"
          />
        </>
      )}
      <text
        x="28"
        y="492"
        fill={sign ? "#b6d9ca" : "#557d69"}
        fontFamily="sans-serif"
        fontSize="11"
        letterSpacing="3"
      >
        同路就夾 / 車費齊齊慳
      </text>
    </svg>
  );
}
