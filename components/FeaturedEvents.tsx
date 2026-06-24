import EventCard from "@/components/EventCard";
import { IEvent } from '@/database/event.model';
import { getAllEvents } from "@/lib/actions/event.action";

const FeaturedEvents = async () => {
  const events = await getAllEvents();

  return (
    <ul className="events">
      {events && events.length > 0 && events.map((event: IEvent) => (
        <li key={event.slug} className="list-none">
          <EventCard {...event} />
        </li>
      ))}
    </ul>
  );
};

export default FeaturedEvents;