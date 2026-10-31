import styles from "./balance-contours.module.css";

const clusters = [
  {
    location: "right",
    className: "primary",
    cx: 650,
    cy: 130,
    contours: [
      { radius: 142, opacity: 0.16 },
      { radius: 166, opacity: 0.16 },
      { radius: 190, opacity: 0.16 },
      { radius: 214, opacity: 0.14 },
      { radius: 238, opacity: 0.12 },
      { radius: 262, opacity: 0.1 },
      { radius: 286, opacity: 0.08 },
      { radius: 310, opacity: 0.06 },
    ],
  },
  {
    location: "lower-left",
    className: "secondary",
    cx: -15,
    cy: 335,
    contours: [
      { radius: 90, opacity: 0.1 },
      { radius: 114, opacity: 0.075 },
      { radius: 138, opacity: 0.05 },
    ],
  },
  {
    location: "upper-left",
    className: "tertiary",
    cx: -15,
    cy: -75,
    contours: [
      { radius: 105, opacity: 0.075 },
      { radius: 129, opacity: 0.045 },
      { radius: 153, opacity: 0.035 },
    ],
  },
];

export function DesignBalanceContours({ active = false, duration = 9000 }) {
  return (
    <span
      className={styles.contours}
      data-balance-contours
      data-active={active}
      style={{ "--contour-duration": `${duration}ms` }}
      aria-hidden="true"
    >
      {clusters.map(({ location, className, cx, cy, contours }) => (
        <span
          key={location}
          className={`${styles.cluster} ${styles[className]}`}
          data-contour-cluster={location}
        >
          <svg
            viewBox="0 0 500 260"
            preserveAspectRatio="none"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          >
            {contours.map(({ radius, opacity }) => (
              <circle
                key={radius}
                cx={cx}
                cy={cy}
                r={radius}
                strokeOpacity={opacity}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
        </span>
      ))}
    </span>
  );
}
