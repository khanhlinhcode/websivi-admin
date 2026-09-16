import { memo } from "react";
import { useTranslation } from "react-i18next";
import "./style.scss";

const LANGUAGES = [
  { code: "vi", label: "VI" },
  { code: "en", label: "EN" },
];

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const currentLanguage =
    i18n.resolvedLanguage ||
    i18n.language ||
    window.localStorage?.getItem("lang") ||
    "vi";

  const handleChangeLanguage = (language) => {
    window.localStorage?.setItem("lang", language);
    i18n.changeLanguage(language);
  };

  return (
    <div className="language-switcher" aria-label="Language switcher">
      {LANGUAGES.map((language) => (
        <button
          type="button"
          key={language.code}
          className={
            currentLanguage.startsWith(language.code)
              ? "language-switcher__button active"
              : "language-switcher__button"
          }
          onClick={() => handleChangeLanguage(language.code)}
        >
          {language.label}
        </button>
      ))}
    </div>
  );
};

export default memo(LanguageSwitcher);
