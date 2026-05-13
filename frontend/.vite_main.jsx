import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=8223e26c"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=8223e26c"; const StrictMode = __vite__cjsImport1_react["StrictMode"];
import __vite__cjsImport2_reactDom_client from "/node_modules/.vite/deps/react-dom_client.js?v=8223e26c"; const createRoot = __vite__cjsImport2_reactDom_client["createRoot"];
import "/src/index.css";
import App from "/src/App.jsx";
import { ThemeProvider } from "/src/context/ThemeContext.jsx";
import { StaffAuthProvider } from "/src/context/StaffAuthContext.jsx";
import { SocketProvider } from "/src/context/SocketContext.jsx";
import { NotificationProvider } from "/src/context/NotificationContext.jsx";
window.addEventListener("unhandledrejection", (event) => {
  const reason = event?.reason;
  const name = reason?.name;
  const message = reason?.message;
  const text = String(name || message || reason || "");
  if (text.includes("RegisterClientLocalizationsError")) {
    event.preventDefault();
  }
});
createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ jsxDEV(StrictMode, { children: /* @__PURE__ */ jsxDEV(ThemeProvider, { children: /* @__PURE__ */ jsxDEV(StaffAuthProvider, { children: /* @__PURE__ */ jsxDEV(SocketProvider, { children: /* @__PURE__ */ jsxDEV(NotificationProvider, { children: /* @__PURE__ */ jsxDEV(App, {}, void 0, false, {
    fileName: "D:/hotel-booking-order-management-system/frontend/src/main.jsx",
    lineNumber: 27,
    columnNumber: 13
  }, this) }, void 0, false, {
    fileName: "D:/hotel-booking-order-management-system/frontend/src/main.jsx",
    lineNumber: 26,
    columnNumber: 11
  }, this) }, void 0, false, {
    fileName: "D:/hotel-booking-order-management-system/frontend/src/main.jsx",
    lineNumber: 25,
    columnNumber: 9
  }, this) }, void 0, false, {
    fileName: "D:/hotel-booking-order-management-system/frontend/src/main.jsx",
    lineNumber: 24,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "D:/hotel-booking-order-management-system/frontend/src/main.jsx",
    lineNumber: 23,
    columnNumber: 5
  }, this) }, void 0, false, {
    fileName: "D:/hotel-booking-order-management-system/frontend/src/main.jsx",
    lineNumber: 22,
    columnNumber: 3
  }, this)
);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBMEJZO0FBMUJYLFNBQVNBLGtCQUFrQjtBQUM1QixTQUFTQyxrQkFBa0I7QUFDM0IsT0FBTztBQUNQLE9BQU9DLFNBQVM7QUFDaEIsU0FBU0MscUJBQXFCO0FBQzlCLFNBQVNDLHlCQUF5QjtBQUNsQyxTQUFTQyxzQkFBc0I7QUFDL0IsU0FBU0MsNEJBQTRCO0FBRXJDQyxPQUFPQyxpQkFBaUIsc0JBQXNCLENBQUNDLFVBQVU7QUFDdkQsUUFBTUMsU0FBU0QsT0FBT0M7QUFDdEIsUUFBTUMsT0FBT0QsUUFBUUM7QUFDckIsUUFBTUMsVUFBVUYsUUFBUUU7QUFDeEIsUUFBTUMsT0FBT0MsT0FBT0gsUUFBUUMsV0FBV0YsVUFBVSxFQUFFO0FBRW5ELE1BQUlHLEtBQUtFLFNBQVMsa0NBQWtDLEdBQUc7QUFDckROLFVBQU1PLGVBQWU7QUFBQSxFQUN2QjtBQUNGLENBQUM7QUFFRGYsV0FBV2dCLFNBQVNDLGVBQWUsTUFBTSxDQUFDLEVBQUVDO0FBQUFBLEVBQzFDLHVCQUFDLGNBQ0MsaUNBQUMsaUJBQ0MsaUNBQUMscUJBQ0MsaUNBQUMsa0JBQ0MsaUNBQUMsd0JBQ0MsaUNBQUMsU0FBRDtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBQUksS0FETjtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBRUEsS0FIRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBSUEsS0FMRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBTUEsS0FQRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBUUEsS0FURjtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBVUE7QUFDRiIsIm5hbWVzIjpbIlN0cmljdE1vZGUiLCJjcmVhdGVSb290IiwiQXBwIiwiVGhlbWVQcm92aWRlciIsIlN0YWZmQXV0aFByb3ZpZGVyIiwiU29ja2V0UHJvdmlkZXIiLCJOb3RpZmljYXRpb25Qcm92aWRlciIsIndpbmRvdyIsImFkZEV2ZW50TGlzdGVuZXIiLCJldmVudCIsInJlYXNvbiIsIm5hbWUiLCJtZXNzYWdlIiwidGV4dCIsIlN0cmluZyIsImluY2x1ZGVzIiwicHJldmVudERlZmF1bHQiLCJkb2N1bWVudCIsImdldEVsZW1lbnRCeUlkIiwicmVuZGVyIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIm1haW4uanN4Il0sInNvdXJjZXNDb250ZW50IjpbIu+7v2ltcG9ydCB7IFN0cmljdE1vZGUgfSBmcm9tICdyZWFjdCdcclxuaW1wb3J0IHsgY3JlYXRlUm9vdCB9IGZyb20gJ3JlYWN0LWRvbS9jbGllbnQnXHJcbmltcG9ydCAnLi9pbmRleC5jc3MnXHJcbmltcG9ydCBBcHAgZnJvbSAnLi9BcHAuanN4J1xyXG5pbXBvcnQgeyBUaGVtZVByb3ZpZGVyIH0gZnJvbSAnLi9jb250ZXh0L1RoZW1lQ29udGV4dCdcclxuaW1wb3J0IHsgU3RhZmZBdXRoUHJvdmlkZXIgfSBmcm9tICcuL2NvbnRleHQvU3RhZmZBdXRoQ29udGV4dCdcclxuaW1wb3J0IHsgU29ja2V0UHJvdmlkZXIgfSBmcm9tICcuL2NvbnRleHQvU29ja2V0Q29udGV4dCdcclxuaW1wb3J0IHsgTm90aWZpY2F0aW9uUHJvdmlkZXIgfSBmcm9tICcuL2NvbnRleHQvTm90aWZpY2F0aW9uQ29udGV4dCdcclxuXHJcbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd1bmhhbmRsZWRyZWplY3Rpb24nLCAoZXZlbnQpID0+IHtcclxuICBjb25zdCByZWFzb24gPSBldmVudD8ucmVhc29uO1xyXG4gIGNvbnN0IG5hbWUgPSByZWFzb24/Lm5hbWU7XHJcbiAgY29uc3QgbWVzc2FnZSA9IHJlYXNvbj8ubWVzc2FnZTtcclxuICBjb25zdCB0ZXh0ID0gU3RyaW5nKG5hbWUgfHwgbWVzc2FnZSB8fCByZWFzb24gfHwgJycpO1xyXG5cclxuICBpZiAodGV4dC5pbmNsdWRlcygnUmVnaXN0ZXJDbGllbnRMb2NhbGl6YXRpb25zRXJyb3InKSkge1xyXG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICB9XHJcbn0pO1xyXG5cclxuY3JlYXRlUm9vdChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncm9vdCcpKS5yZW5kZXIoXHJcbiAgPFN0cmljdE1vZGU+XHJcbiAgICA8VGhlbWVQcm92aWRlcj5cclxuICAgICAgPFN0YWZmQXV0aFByb3ZpZGVyPlxyXG4gICAgICAgIDxTb2NrZXRQcm92aWRlcj5cclxuICAgICAgICAgIDxOb3RpZmljYXRpb25Qcm92aWRlcj5cclxuICAgICAgICAgICAgPEFwcCAvPlxyXG4gICAgICAgICAgPC9Ob3RpZmljYXRpb25Qcm92aWRlcj5cclxuICAgICAgICA8L1NvY2tldFByb3ZpZGVyPlxyXG4gICAgICA8L1N0YWZmQXV0aFByb3ZpZGVyPlxyXG4gICAgPC9UaGVtZVByb3ZpZGVyPlxyXG4gIDwvU3RyaWN0TW9kZT4sXHJcbilcclxuIl0sImZpbGUiOiJEOi9ob3RlbC1ib29raW5nLW9yZGVyLW1hbmFnZW1lbnQtc3lzdGVtL2Zyb250ZW5kL3NyYy9tYWluLmpzeCJ9