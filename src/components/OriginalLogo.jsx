import { Link } from "react-router-dom";

// Original logo retained for future use with the existing .brand styles.
export default function OriginalLogo() {
  return (
    <Link to="/" className="brand" aria-label="MM Prestige Motors home">
      <span className="brand-symbol">
        <i />
        <i />
      </span>
      <span>
        <b>MM PRESTIGE</b>
        <small>M O T O R S</small>
      </span>
    </Link>
  );
}
