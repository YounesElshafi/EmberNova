import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./styles.css";

const query = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 60000, refetchOnWindowFocus: false },
  },
});
ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <QueryClientProvider client={query}>
      <App />
    </QueryClientProvider>
  </BrowserRouter>,
);
