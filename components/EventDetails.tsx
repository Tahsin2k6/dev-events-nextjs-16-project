import { notFound } from "next/navigation";
import Image from "next/image";
import BookEvent from "@/components/BookEvent";
import { IEvent } from "@/database";
import EventCard from "@/components/EventCard";
import { getEventBySlug, getSimilarEvents } from "@/lib/actions/event.action";

const EventDetailItem = ({ icon, alt, label }: { icon: string; alt: string; label: string }) => (
    <div className="flex flex-row gap-2 items-center">
        <Image src={icon} alt={alt} width={17} height={17} />
        <p>{label}</p>
    </div>
);

const EventTags = ({ tags }: { tags: string[] }) => (
    <div className="flex flex-row gap-1.5 flex-wrap">
        {tags.map((tag) => (
            <div className="pill" key={tag}>{tag}</div>
        ))}
    </div>
);

const EventAgenda = ({ agendaItems }: { agendaItems: string[] }) => (
    <div className="agenda">
        <h2>Agenda</h2>
        <ul>
            {agendaItems.map((item) => (
                <li key={item}>{item}</li>
            ))}
        </ul>
    </div>
);

const EventDetails = async ({ params }: { params: Promise<{ slug: string }> }) => {
    const { slug } = await params;

    const event = await getEventBySlug(slug);
    if (!event) return notFound();

    const { _id, description, image, date, time, overview, location, mode, agenda, audience, tags, organizer, slug: eventSlug } = event;

    const bookings = 10;

    const similarEvents: IEvent[] = await getSimilarEvents(String(_id), tags);

    return (
        <section id='event'>
            <div className="header">
                <h1>Event Description</h1>
                <p>{description}</p>
            </div>

            <div className="details">
                <div className="content">
                    <Image src={image} alt="event-banner" width={800} height={800} className="banner" />

                    <section className="flex-col-gap-2">
                        <h2>Overview</h2>
                        <p>{overview}</p>
                    </section>

                    <section className="flex-col-gap-2">
                        <h2>Event Details</h2>

                        <EventDetailItem icon="/icons/calendar.svg" alt="calendar" label={date} />
                        <EventDetailItem icon="/icons/clock.svg" alt="clock" label={time} />
                        <EventDetailItem icon="/icons/pin.svg" alt="pin" label={location} />
                        <EventDetailItem icon="/icons/mode.svg" alt="mode" label={mode} />
                        <EventDetailItem icon="/icons/audience.svg" alt="audience" label={audience} />
                    </section>

                    <EventAgenda agendaItems={agenda} />

                    <section>
                        <h2>About the Organizer</h2>
                        <p>{organizer}</p>
                    </section>

                    <EventTags tags={tags} />
                </div>

                <aside className="booking">
                    <div className="signup-card">
                        <h2>Book your spot</h2>
                        {bookings > 0 ? (
                            <p className="text-sm">Join {bookings} people who have already booked their spot!</p>
                        ) : (
                            <p className="text-sm">Be the first one to book your spot!</p>
                        )}

                        <BookEvent eventID={String(_id)} slug={eventSlug} />
                    </div>
                </aside>
            </div>

            <div className="flex w-full flex-col gap-4 pt-20">
                <h2>Similar Events</h2>
                {similarEvents.length > 0 && similarEvents.map((similarEvent: IEvent) => (
                    <EventCard key={similarEvent.title} {...similarEvent} />
                ))}
            </div>
        </section>
    );
};

export default EventDetails;