const CATEGORY_TRANSLATION_KEYS = {
  "rau cu": "categories.vegetables",
  "rau cu tuoi": "categories.freshVegetables",
  sua: "categories.milk",
  "sua hop": "categories.milkBox",
  "thit tuoi": "categories.freshMeat",
  "thit bo": "categories.beef",
  "thit bo nat": "categories.leanBeef",
  "thuc an nhanh": "categories.fastFood",
  "trai cay": "categories.fruit",
  "cam tuoi": "categories.freshOrange",
  "hoa qua kho": "categories.driedFruit",
};

const PRODUCT_TRANSLATION_KEYS = {
  "thit bo nat": "leanBeef",
  chuoi: "banana",
  oi: "guava",
  "dua hau": "watermelon",
  "nho tim": "purpleGrapes",
  hamburger: "hamburger",
  "xoai keo": "greenMango",
  "tao uc": "australianApple",
  "cam tuoi": "freshOrange",
  "rau cu tuoi": "freshVegetables",
  "sua hop": "milkBox",
};

export const normalizeVietnameseLabel = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export const translateCategoryName = (name, t) => {
  const key = CATEGORY_TRANSLATION_KEYS[normalizeVietnameseLabel(name)];

  return key ? t(key) : name;
};

const getProductSourceName = (productOrName) => {
  if (typeof productOrName === "string") {
    return productOrName;
  }

  return productOrName?.name || productOrName?.product_name || "";
};

const getProductTranslationKey = (productOrName) =>
  productOrName?.translation_key ||
  productOrName?.i18n_key ||
  PRODUCT_TRANSLATION_KEYS[normalizeVietnameseLabel(getProductSourceName(productOrName))];

export const translateProductName = (productOrName, t) => {
  const sourceName = getProductSourceName(productOrName);
  const key = getProductTranslationKey(productOrName);

  return key ? t(`productData.names.${key}`, { defaultValue: sourceName }) : sourceName;
};

export const translateProductShortDescription = (product, t) => {
  const key = getProductTranslationKey(product);

  return key
    ? t(`productData.shortDescriptions.${key}`, {
        defaultValue: product?.sort_description || "",
      })
    : product?.sort_description || "";
};

export const translateProductDescription = (product, t) => {
  const key = getProductTranslationKey(product);

  return key
    ? t(`productData.descriptions.${key}`, {
        defaultValue: product?.description || "",
      })
    : product?.description || "";
};

export const getDateLocale = (language = "vi") =>
  String(language).toLowerCase().startsWith("en") ? "en-US" : "vi-VN";
