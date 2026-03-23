import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { NotificationProvider, useNotification } from './NotificationContext';
import type { NotificationType } from './NotificationContext';

function TestComponent() {
  const { notifications, showNotification, removeNotification } = useNotification();

  return (
    <div>
      <button
        onClick={() => showNotification('success', 'Test success', 5000)}
        data-testid="show-btn"
      >
        Show
      </button>
      <div data-testid="count">{notifications.length}</div>
      <div data-testid="list">
        {notifications.map((n) => (
          <div key={n.id} data-testid={`notif-${n.type}`} data-id={n.id}>
            {n.message}
            <button onClick={() => removeNotification(n.id)} data-testid={`remove-${n.id}`}>X</button>
          </div>
        ))}
      </div>
    </div>
  );
}

describe('NotificationContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with empty notifications', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('should throw error when useNotification used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const Component = () => {
      try {
        useNotification();
        return <div>should not render</div>;
      } catch (e) {
        return <div data-testid="error">{(e as Error).message}</div>;
      }
    };

    render(<Component />);
    expect(screen.getByTestId('error')).toHaveTextContent('useNotification must be used within');
    spy.mockRestore();
  });

  it('should add notification when showNotification is called', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    act(() => {
      screen.getByTestId('show-btn').click();
    });

    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(screen.getByTestId('notif-success')).toBeInTheDocument();
    expect(screen.getByTestId('notif-success')).toHaveTextContent('Test success');
  });

  it('should remove notification when removeNotification is called', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    act(() => {
      screen.getByTestId('show-btn').click();
    });

    expect(screen.getByTestId('count')).toHaveTextContent('1');

    const notif = screen.getByTestId('notif-success');
    const notifId = notif.getAttribute('data-id');

    act(() => {
      screen.getByTestId(`remove-${notifId}`).click();
    });

    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('should add multiple notifications independently', () => {
    const TestMultiple = () => {
      const { showNotification, notifications } = useNotification();

      return (
        <div>
          <button onClick={() => showNotification('success', 'Success')} data-testid="btn-success">Success</button>
          <button onClick={() => showNotification('error', 'Error')} data-testid="btn-error">Error</button>
          <button onClick={() => showNotification('info', 'Info')} data-testid="btn-info">Info</button>
          <div data-testid="count">{notifications.length}</div>
          <div data-testid="types">{notifications.map(n => n.type).join(',')}</div>
        </div>
      );
    };

    render(
      <NotificationProvider>
        <TestMultiple />
      </NotificationProvider>
    );

    act(() => {
      screen.getByTestId('btn-success').click();
      screen.getByTestId('btn-error').click();
      screen.getByTestId('btn-info').click();
    });

    expect(screen.getByTestId('count')).toHaveTextContent('3');
    expect(screen.getByTestId('types')).toHaveTextContent('success,error,info');
  });

  it('should auto-dismiss notification after duration expires', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    act(() => {
      screen.getByTestId('show-btn').click();
    });

    expect(screen.getByTestId('count')).toHaveTextContent('1');

    // Advance time by 4999ms (less than 5000ms duration)
    act(() => {
      vi.advanceTimersByTime(4999);
    });

    expect(screen.getByTestId('count')).toHaveTextContent('1');

    // Advance time to 5000ms
    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('should not auto-dismiss notification when duration is 0', () => {
    const TestNoDismiss = () => {
      const { showNotification, notifications } = useNotification();

      return (
        <div>
          <button onClick={() => showNotification('info', 'Persistent', 0)} data-testid="btn">Show</button>
          <div data-testid="count">{notifications.length}</div>
        </div>
      );
    };

    render(
      <NotificationProvider>
        <TestNoDismiss />
      </NotificationProvider>
    );

    act(() => {
      screen.getByTestId('btn').click();
    });

    expect(screen.getByTestId('count')).toHaveTextContent('1');

    // Advance time significantly
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    // Should still be there
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });

  it('should use default duration of 5000ms when not specified', () => {
    const TestDefault = () => {
      const { showNotification, notifications } = useNotification();

      return (
        <div>
          <button onClick={() => showNotification('warning', 'Default duration')} data-testid="btn">Show</button>
          <div data-testid="count">{notifications.length}</div>
        </div>
      );
    };

    render(
      <NotificationProvider>
        <TestDefault />
      </NotificationProvider>
    );

    act(() => {
      screen.getByTestId('btn').click();
    });

    // After 4999ms
    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(screen.getByTestId('count')).toHaveTextContent('1');

    // After 5000ms total
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('should handle multiple notifications with different durations', () => {
    const TestMultipleDurations = () => {
      const { showNotification, notifications } = useNotification();

      return (
        <div>
          <button onClick={() => {
            showNotification('success', 'Fast', 2000);
            showNotification('error', 'Slow', 4000);
          }} data-testid="btn">Show Both</button>
          <div data-testid="count">{notifications.length}</div>
        </div>
      );
    };

    render(
      <NotificationProvider>
        <TestMultipleDurations />
      </NotificationProvider>
    );

    act(() => {
      screen.getByTestId('btn').click();
    });

    expect(screen.getByTestId('count')).toHaveTextContent('2');

    // After 2000ms, one should be gone
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('count')).toHaveTextContent('1');

    // After 4000ms total, both should be gone
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('should preserve notification type', () => {
    const TestTypes = () => {
      const { showNotification, notifications } = useNotification();
      const types: NotificationType[] = ['success', 'error', 'warning', 'info'];

      return (
        <div>
          <button onClick={() => {
            types.forEach(type => showNotification(type, `${type} message`));
          }} data-testid="btn">Show All</button>
          <div>{notifications.map(n => <div key={n.id} data-testid={`type-${n.type}`}>{n.type}</div>)}</div>
        </div>
      );
    };

    render(
      <NotificationProvider>
        <TestTypes />
      </NotificationProvider>
    );

    act(() => {
      screen.getByTestId('btn').click();
    });

    expect(screen.getByTestId('type-success')).toBeInTheDocument();
    expect(screen.getByTestId('type-error')).toBeInTheDocument();
    expect(screen.getByTestId('type-warning')).toBeInTheDocument();
    expect(screen.getByTestId('type-info')).toBeInTheDocument();
  });
});
