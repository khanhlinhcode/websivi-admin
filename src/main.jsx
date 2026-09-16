import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import "./i18n";
import "./style/style.scss";
import store from "./redux/store";
import AuthBootstrap from "./component/AuthBootstrap";
import Router from "./router";

ReactDOM.createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <BrowserRouter>
      <AuthBootstrap />
      <Router />
      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
    </BrowserRouter>
  </Provider>
);
