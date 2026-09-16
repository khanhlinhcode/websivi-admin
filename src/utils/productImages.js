import placeholder from "../assets/product-placeholder.svg";
import feature1Img from "assets/users/images/featured/feature-1.png";
import feature2Img from "assets/users/images/featured/feature-2.png";
import feature3Img from "assets/users/images/featured/feature-3.png";
import feature4Img from "assets/users/images/featured/feature-4.png";
import feature5Img from "assets/users/images/featured/feature-5.png";
import feature6Img from "assets/users/images/featured/feature-6.png";
import feature7Img from "assets/users/images/featured/feature-7.png";
import feature8Img from "assets/users/images/featured/feature-8.png";

export const PRODUCT_IMAGE_OPTIONS = [
  { label: "Feature 1", value: "/assets/users/images/featured/feature-1.png" },
  { label: "Feature 2", value: "/assets/users/images/featured/feature-2.png" },
  { label: "Feature 3", value: "/assets/users/images/featured/feature-3.png" },
  { label: "Feature 4", value: "/assets/users/images/featured/feature-4.png" },
  { label: "Feature 5", value: "/assets/users/images/featured/feature-5.png" },
  { label: "Feature 6", value: "/assets/users/images/featured/feature-6.png" },
  { label: "Feature 7", value: "/assets/users/images/featured/feature-7.png" },
  { label: "Feature 8", value: "/assets/users/images/featured/feature-8.png" },
];

const productImageMap = {
  "/assets/users/images/featured/feature-1.png": feature1Img,
  "/assets/users/images/featured/feature-2.png": feature2Img,
  "/assets/users/images/featured/feature-3.png": feature3Img,
  "/assets/users/images/featured/feature-4.png": feature4Img,
  "/assets/users/images/featured/feature-5.png": feature5Img,
  "/assets/users/images/featured/feature-6.png": feature6Img,
  "/assets/users/images/featured/feature-7.png": feature7Img,
  "/assets/users/images/featured/feature-8.png": feature8Img,
};

export const resolveProductImage = (path) => {
  return productImageMap[path] || path || placeholder;
};
