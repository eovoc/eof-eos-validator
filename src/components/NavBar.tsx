import { NavLink } from "react-router-dom";

export default function NavBar() {
  return (
    <nav className="navbar">
      <span className="navbar-brand">EOF-EOS Tools</span>
      <div className="navbar-links">
        <NavLink to="/" end className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          OGC
        </NavLink>
        <NavLink to="/converter" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          STAC
        </NavLink>
      </div>
    </nav>
  );
}
