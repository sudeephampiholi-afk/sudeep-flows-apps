import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { mockActivity } from '../__mocks__/asset360';
import type { Activity } from '../domain/asset360Types';
import { renderWithProviders } from '../test/renderWithProviders';

import { ActivitiesPanel } from './ActivitiesPanel';
import type { ActivitiesViewModel } from './useActivitiesViewModel';

const SOURCE_ACTIVITY = {
  id: { space: 'activity-space', externalId: 'activity-2' },
  name: 'Replace pump seal',
  description: 'Replace the worn mechanical seal.',
  tags: ['corrective', 'priority'],
  sourceId: 'SAP-200',
  sourceContext: 'SAP maintenance',
  source: { space: 'source-space', externalId: 'sap' },
  sourceCreatedTime: '2026-03-10T08:00:00.000Z',
  sourceUpdatedTime: '2026-03-12T09:30:00.000Z',
  sourceCreatedUser: 'planner',
  sourceUpdatedUser: 'technician',
  startTime: '2026-03-12T10:00:00.000Z',
  endTime: '2026-03-12T12:00:00.000Z',
  scheduledStartTime: '2026-03-12T09:00:00.000Z',
  scheduledEndTime: '2026-03-12T13:00:00.000Z',
};

describe('ActivitiesPanel', () => {
  it('renders loading, empty, no-access, and error states with retry', async () => {
    const retry = vi.fn();
    const { rerender } = renderWithProviders(
      <ActivitiesPanel viewModel={makeViewModel({ status: 'loading', retry })} />
    );
    expect(
      screen.getByText('Loading work orders / activities...')
    ).toBeInTheDocument();

    rerender(
      <ActivitiesPanel viewModel={makeViewModel({ status: 'empty', retry })} />
    );
    expect(
      screen.getByRole('heading', { name: 'No related activities' })
    ).toBeInTheDocument();

    rerender(
      <ActivitiesPanel
        viewModel={makeViewModel({
          status: 'noAccess',
          errorMessage: 'You do not have access to activities.',
          retry,
        })}
      />
    );
    expect(
      screen.getByText('You do not have access to activities.')
    ).toBeInTheDocument();

    rerender(
      <ActivitiesPanel
        viewModel={makeViewModel({
          status: 'error',
          errorMessage: 'Activities could not be loaded.',
          retry,
        })}
      />
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Retry activities' })
    );
    expect(retry).toHaveBeenCalledOnce();
  });

  it('renders the activity count and every activity as a compact list row', () => {
    const activities = makeActivities(18);
    renderWithProviders(
      <ActivitiesPanel
        viewModel={makeViewModel({
          status: 'success',
          activities,
        })}
      />
    );

    expect(screen.getByText('18 related activities')).toBeInTheDocument();
    expect(
      screen.getByRole('list', { name: 'Work orders / activities' })
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /Open activity details for/ })
    ).toHaveLength(18);
    expect(screen.getByText('activity-2')).toBeInTheDocument();
    expect(screen.getByText('Replace pump seal')).toBeInTheDocument();
    expect(screen.getByText('Mar 12, 2026, 12:00 PM')).toBeInTheDocument();
    expect(screen.getByText('SAP-200')).toBeInTheDocument();
    expect(screen.getByText('Fallback activity description')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.queryByText(/status/i)).not.toBeInTheDocument();
  });

  it('renders long activity lists in pages with a show more action', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ActivitiesPanel
        viewModel={makeViewModel({
          status: 'success',
          activities: makeActivities(60),
        })}
      />
    );

    expect(screen.getByText('60 related activities')).toBeInTheDocument();
    expect(screen.getByText('Showing 25 of 60')).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /Open activity details for/ })
    ).toHaveLength(25);

    await user.click(
      screen.getByRole('button', { name: 'Show more activities' })
    );
    expect(screen.getByText('Showing 50 of 60')).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /Open activity details for/ })
    ).toHaveLength(50);

    await user.click(
      screen.getByRole('button', { name: 'Show more activities' })
    );
    expect(
      screen.getAllByRole('button', { name: /Open activity details for/ })
    ).toHaveLength(60);
    expect(screen.queryByText(/^Showing /)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Show more activities' })
    ).not.toBeInTheDocument();
  });

  it('does not show paging controls when every activity fits on one page', () => {
    renderWithProviders(
      <ActivitiesPanel
        viewModel={makeViewModel({
          status: 'success',
          activities: makeActivities(18),
        })}
      />
    );

    expect(
      screen.queryByRole('button', { name: 'Show more activities' })
    ).not.toBeInTheDocument();
  });

  it('activates semantic row buttons by pointer, Enter, and Space', async () => {
    const selectActivity = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <ActivitiesPanel
        viewModel={makeViewModel({
          status: 'success',
          activities: [SOURCE_ACTIVITY],
          selectActivity,
        })}
      />
    );
    const rowAction = screen.getByRole('button', {
      name: 'Open activity details for activity-2',
    });

    await user.click(rowAction);
    rowAction.focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(selectActivity).toHaveBeenCalledTimes(3);
    expect(selectActivity.mock.calls).toEqual([
      [SOURCE_ACTIVITY.id],
      [SOURCE_ACTIVITY.id],
      [SOURCE_ACTIVITY.id],
    ]);
  });

  it('shows only verified activity details and closes them', async () => {
    const closeActivity = vi.fn();
    renderWithProviders(
      <ActivitiesPanel
        viewModel={makeViewModel({
          status: 'success',
          activities: [SOURCE_ACTIVITY],
          selectedActivity: SOURCE_ACTIVITY,
          closeActivity,
        })}
      />
    );

    expect(
      screen.getByRole('heading', { name: 'Activity details' })
    ).toBeInTheDocument();
    expect(
      screen
        .getByRole('button', {
          name: 'Open activity details for activity-2',
        })
        .closest('[data-slot="item"]')
    ).toHaveAttribute('data-selected');
    expect(
      screen.getByRole('button', {
        name: 'Open activity details for activity-2',
      })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByText('activity-2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Replace pump seal').length).toBeGreaterThan(0);
    expect(
      screen.getByText('Replace the worn mechanical seal.')
    ).toBeInTheDocument();
    expect(screen.getByText('corrective, priority')).toBeInTheDocument();
    expect(screen.getByText('source-space:sap')).toBeInTheDocument();
    expect(screen.getByText('planner')).toBeInTheDocument();
    expect(screen.getByText('technician')).toBeInTheDocument();
    expect(screen.getByText('Mar 12, 2026, 10:00 AM')).toBeInTheDocument();
    expect(screen.getByText('Mar 12, 2026, 1:00 PM')).toBeInTheDocument();
    expect(screen.queryByText(/status/i)).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Close activity details' })
    );
    expect(closeActivity).toHaveBeenCalledOnce();
  });
});

function makeViewModel(
  overrides: Partial<ActivitiesViewModel> = {}
): ActivitiesViewModel {
  return {
    status: 'loading',
    activities: [],
    selectedActivity: undefined,
    errorMessage: undefined,
    shareStateWarning: false,
    retry: vi.fn(),
    selectActivity: vi.fn(),
    closeActivity: vi.fn(),
    ...overrides,
  };
}

function makeActivities(count: number): Activity[] {
  const fallbackActivity: Activity = {
    id: { space: 'activity-space', externalId: 'activity-3' },
    name: undefined,
    description: 'Fallback activity description',
    tags: [],
  };
  const generatedActivities = Array.from(
    { length: Math.max(0, count - 3) },
    (_value: unknown, index: number): Activity => ({
      id: {
        space: 'activity-space',
        externalId: `activity-${index + 4}`,
      },
      name: `Activity ${index + 4}`,
      description: undefined,
      tags: [],
      startTime: '2026-03-11T08:00:00.000Z',
      sourceContext: 'Maintenance',
    })
  );
  return [SOURCE_ACTIVITY, mockActivity, fallbackActivity, ...generatedActivities].slice(
    0,
    count
  );
}
