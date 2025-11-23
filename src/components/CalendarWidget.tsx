import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';

interface Event {
  time: string;
  title: string;
  deadline?: number;
  campaignName?: string;
  campaignAddress?: string;
}

interface CalendarWidgetProps {
  events: Event[];
}

const CalendarWidget = ({ events }: CalendarWidgetProps) => {
  const [isFullCalendarOpen, setIsFullCalendarOpen] = useState(false);
  const currentDate = new Date();
  const dateString = currentDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    weekday: 'short' 
  });

  // Group events by date for full calendar view
  const eventsByDate = events.reduce((acc, event) => {
    if (event.deadline) {
      const date = new Date(event.deadline * 1000);
      const dateKey = date.toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(event);
    }
    return acc;
  }, {} as Record<string, Event[]>);

  // Get dates with events for calendar highlighting
  const datesWithEvents = Object.keys(eventsByDate).map(dateStr => new Date(dateStr));

  return (
    <>
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Upcoming Deadlines</h2>
          <Badge variant="outline" className="text-xs">
            {events.length}
          </Badge>
        </div>

        <div className="space-y-2">
          {events.length === 0 ? (
            <div className="text-center text-muted-foreground py-6 text-sm">
              <div className="text-4xl mb-2">📅</div>
              <p>No upcoming deadlines</p>
            </div>
          ) : (
            events.map((event, idx) => {
              const deadlineDate = event.deadline ? new Date(event.deadline * 1000) : null;
              const isToday = deadlineDate && deadlineDate.toDateString() === new Date().toDateString();
              const isPast = deadlineDate && deadlineDate < new Date();
              
              return (
                <div 
                  key={idx} 
                  className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                    isPast 
                      ? 'bg-destructive/10 border border-destructive/20' 
                      : isToday
                      ? 'bg-primary/10 border border-primary/30'
                      : 'bg-secondary/50 hover:bg-secondary/70 border border-transparent'
                  }`}
                >
                  <div className="flex flex-col min-w-[100px]">
                    <span className={`text-xs font-semibold ${
                      isPast ? 'text-destructive' : isToday ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                      {deadlineDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {deadlineDate?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      isPast ? 'text-destructive' : 'text-foreground'
                    }`}>
                      {event.campaignName || event.title}
                    </p>
                    {isPast && (
                      <p className="text-[10px] text-destructive mt-0.5">Expired</p>
                    )}
                    {isToday && !isPast && (
                      <p className="text-[10px] text-primary mt-0.5">Due today</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <Button
          variant="ghost"
          className="w-full mt-4 text-sm text-primary hover:text-primary/80"
          onClick={() => setIsFullCalendarOpen(true)}
        >
          See full calendar →
        </Button>
      </Card>

      {/* Full Calendar Dialog */}
      <Dialog open={isFullCalendarOpen} onOpenChange={setIsFullCalendarOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Campaign Deadlines Calendar</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div>
              <Calendar
                mode="single"
                className="rounded-md border"
                modifiers={{
                  hasEvent: (date) => datesWithEvents.some(d => 
                    d.toDateString() === date.toDateString()
                  )
                }}
                modifiersClassNames={{
                  hasEvent: "bg-primary/20 border-primary"
                }}
              />
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-sm mb-3">Upcoming Deadlines</h3>
              {Object.entries(eventsByDate)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([dateStr, dayEvents]) => {
                  const date = new Date(dateStr);
                  return (
                    <div key={dateStr} className="space-y-2">
                      <div className="text-sm font-semibold text-foreground border-b pb-1">
                        {date.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          month: 'long', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                      {dayEvents.map((event, idx) => (
                        <div 
                          key={idx}
                          className="p-2 bg-secondary/50 rounded text-sm"
                        >
                          <div className="font-medium">{event.campaignName || event.title}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Expires: {new Date(event.deadline! * 1000).toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              hour12: true
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              {Object.keys(eventsByDate).length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No upcoming deadlines
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CalendarWidget;
