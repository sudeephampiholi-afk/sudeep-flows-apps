import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@cognite/aura/components/alert';
import { Button } from '@cognite/aura/components/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cognite/aura/components/card';
import { Component, type ErrorInfo, type ReactNode } from 'react';

type AppErrorBoundaryProps = {
  children: ReactNode;
  reloadPage(): void;
  reportError?: (error: Error, errorInfo: ErrorInfo) => void;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(_error: Error): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.reportError?.(error, errorInfo);
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="min-h-screen overflow-x-hidden bg-base-background text-base-foreground">
        <section className="mx-auto flex min-h-screen min-w-0 w-full max-w-lg flex-col justify-center px-4 py-6 sm:px-6 sm:py-8">
          <Card>
            <CardHeader>
              <CardTitle as="h1">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-start gap-4">
                <Alert variant="error">
                  <AlertTitle>Asset 360 could not continue</AlertTitle>
                  <AlertDescription>
                    Reload the app to start again. Your shared Fusion URL will
                    remain available.
                  </AlertDescription>
                </Alert>
                <Button onClick={this.props.reloadPage}>Reload app</Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }
}
