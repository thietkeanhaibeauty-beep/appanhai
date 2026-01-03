import { User, Settings, KeyRound, LogOut, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";

interface UserProfileMenuProps {
  userName: string;
  userEmail: string;
  accountName?: string;
  accountId?: string;
  children: React.ReactNode;
  onOpenProfileSettings: () => void;
  onOpenChangePassword: () => void;
  onLogout: () => void;
}

const UserProfileMenu = ({
  userName,
  userEmail,
  accountName,
  accountId,
  children,
  onOpenProfileSettings,
  onOpenChangePassword,
  onLogout,
}: UserProfileMenuProps) => {
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'vi' ? 'en' : 'vi');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
        {/* Ad Account Info */}
        {accountId && (
          <>
            <div className="px-2 py-1.5 text-xs text-muted-foreground font-mono truncate">
              {accountId}
            </div>
            <DropdownMenuLabel className="py-1">
              <p className="text-sm font-semibold truncate">{accountName || t('Tài khoản QC', 'Ad Account')}</p>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        {!accountId && (
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            </div>
          </DropdownMenuLabel>
        )}
        <DropdownMenuItem onClick={onOpenProfileSettings}>
          <Settings className="mr-2 h-4 w-4" />
          <span>{t('Cài đặt', 'Settings')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onOpenChangePassword}>
          <KeyRound className="mr-2 h-4 w-4" />
          <span>{t('Đổi mật khẩu', 'Change Password')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={toggleLanguage}>
          <Globe className="mr-2 h-4 w-4" />
          <span className="flex-1">{t('Ngôn ngữ', 'Language')}</span>
          <span className="text-xs text-muted-foreground ml-2">
            {language === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t('Đăng xuất', 'Sign Out')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserProfileMenu;

