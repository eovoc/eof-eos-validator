import { NavLink } from "react-router-dom";

export default function NavBar() {
  return (
    <nav className="navbar">
      <span className="navbar-brand">EOPF-EOS Tools</span>
      <div className="navbar-links">
        <NavLink to="/" end className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          EOPF-EOS
        </NavLink>
        <NavLink to="/converter" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          STAC
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          Settings
        </NavLink>
      </div>
    </nav>
  );
}
