import { Component } from "react";
import { RefreshCw, Home, AlertTriangle } from "lucide-react";
import { AppButton, AppCard } from "./index";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console for developers
    console.error("ErrorBoundary caught an error:", error);
    console.error("Error details:", errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // You could also send error reports to a logging service here
    // Example: logErrorToService(error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/dashboard";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <AppCard className="max-w-lg w-full text-center">
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle size={40} className="text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-[#142a42] mb-2">
                عذراً، حدث خطأ ما
              </h1>
              <p className="text-gray-500 leading-relaxed">
                نعتذر عن هذا الخطأ. يمكنك محاولة تحديث الصفحة أو العودة للصفحة الرئيسية.
                إذا استمرت المشكلة، يرجى التواصل مع الدعم الفني.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <AppButton
                onClick={this.handleReload}
                variant="primary"
                leftIcon={<RefreshCw size={18} />}
              >
                تحديث الصفحة
              </AppButton>
              
              <AppButton
                onClick={this.handleGoHome}
                variant="outline"
                leftIcon={<Home size={18} />}
              >
                الصفحة الرئيسية
              </AppButton>
            </div>

            {/* Show error details only in development */}
            {import.meta.env.DEV && this.state.error && (
              <div className="mt-6 pt-6 border-t border-gray-200 text-left">
                <p className="text-sm font-semibold text-red-600 mb-2">تفاصيل الخطأ (للمطورين فقط):</p>
                <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40 text-gray-700">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </div>
            )}
          </AppCard>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
