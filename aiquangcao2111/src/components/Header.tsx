import { Link } from "react-router-dom";
import { NotificationBell } from "./NotificationBell";

const Header = () => {

  return (
    <>
      <header className="border-b bg-card/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center justify-between px-3 md:px-6 py-3 md:py-4">
          <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
            <Link to="/" className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity cursor-pointer">
              <img
                src="/logo192.png"
                alt="AIadsfb.com"
                className="w-8 h-8 md:w-11 md:h-11 rounded-lg flex-shrink-0"
              />
              <h1 className="font-semibold text-foreground text-base md:text-lg truncate bg-gradient-to-r from-[#e91e63] via-[#ff7043] to-[#ff7043] bg-clip-text text-transparent">
                AIadsfb.com
              </h1>
            </Link>
            <div className="ml-1">
              <NotificationBell />
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
