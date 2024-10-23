import type { Course, StatusType } from '@shared/types/Course';
import type { CourseMeeting } from '@shared/types/CourseMeeting';
import { Button } from '@views/components/common/Button';
import Divider from '@views/components/common/Divider';
import { LargeLogo } from '@views/components/common/LogoIcon';
import Text from '@views/components/common/Text/Text';
import useChangelog from '@views/hooks/useChangelog';
import useSchedules from '@views/hooks/useSchedules';
import React, { useCallback, useEffect } from 'react';

import IconoirGitFork from '~icons/iconoir/git-fork';

import CalendarFooter from '../calendar/CalendarFooter';
import { CalendarSchedules } from '../calendar/CalendarSchedules';
import ImportantLinks from '../calendar/ImportantLinks';
import TeamLinks from '../calendar/TeamLinks';
import CampusMap from './CampusMap';

const manifest = chrome.runtime.getManifest();
const LDIconURL = new URL('/src/assets/LD-icon.png', import.meta.url).href;

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
type Day = (typeof DAYS)[number];

/**
 * Renders the map component for the UTRP (UT Registration Plus) extension.
 */
export default function Map(): JSX.Element {
    const handleChangelogOnClick = useChangelog();
    const [activeSchedule] = useSchedules();

    /**
     * Function to extract and format basic course information
     */
    function extractCourseInfo(course: Course) {
        const {
            status,
            schedule: { meetings },
        } = course;

        let courseDeptAndInstr = `${course.department} ${course.number}`;

        const mainInstructor = course.instructors[0];
        if (mainInstructor) {
            courseDeptAndInstr += ` – ${mainInstructor.toString({ format: 'first_last', case: 'capitalize' })}`;
        }

        return { status, courseDeptAndInstr, meetings, course };
    }

    // /**
    //  * Function to process each in-person class into its distinct meeting objects for calendar grid
    //  */
    // function processAsyncCourses({
    //     courseDeptAndInstr,
    //     status,
    //     course,
    // }: {
    //     courseDeptAndInstr: string;
    //     status: StatusType;
    //     course: Course;
    // }): CalendarGridCourse[] {
    //     return [
    //         {
    //             calendarGridPoint: {
    //                 dayIndex: -1,
    //                 startIndex: -1,
    //                 endIndex: -1,
    //             },
    //             componentProps: {
    //                 courseDeptAndInstr,
    //                 status,
    //                 colors: course.colors,
    //             },
    //             course,
    //             async: true,
    //         },
    //     ];
    // }

    /**
     * Function to process each in-person class into its distinct meeting objects for calendar grid
     */
    function processInPersonMeetings(
        meeting: CourseMeeting,
        courseDeptAndInstr: string,
        status: StatusType,
        course: Course
    ) {
        const { days, location } = meeting;
        const time = meeting.getTimeString({ separator: '-', capitalize: true });
        const timeAndLocation = `${time}${location ? ` - ${location.building}` : ''}`;

        return days.map(day => ({
            day,
            fullName: `${courseDeptAndInstr} - ${timeAndLocation}`,
            time,
            location,
            status,
            colors: course.colors,
            course,
        }));
    }

    const processedCourses = activeSchedule.courses.flatMap(course => {
        const { status, courseDeptAndInstr, meetings } = extractCourseInfo(course);

        // if (meetings.length === 0) {
        //     return processAsyncCourses({ courseDeptAndInstr, status, course });
        // }

        return meetings.flatMap(meeting =>
            // if (meeting.days.includes(DAY_MAP.S) || meeting.startTime < 480) {
            //     return processAsyncCourses({ courseDeptAndInstr, status, course });
            // }

            processInPersonMeetings(meeting, courseDeptAndInstr, status, course)
        );
    });

    const generateWeekSchedule = useCallback((): Record<Day, string[]> => {
        const weekSchedule: Record<string, string[]> = {};

        processedCourses.forEach(course => {
            const { day } = course;

            // Add the course to the day's schedule
            if (!weekSchedule[day]) weekSchedule[day] = [];
            weekSchedule[day].push(course.fullName);
        });

        // TODO: Not the best way to do this
        // currently weekSchedule is an object with keys as days and values as an array of courses
        // we want to display the days in order, so we create a new object with the days in order

        const orderedWeekSchedule: Record<Day, string[]> = {
            Monday: [],
            Tuesday: [],
            Wednesday: [],
            Thursday: [],
            Friday: [],
            Saturday: [],
            Sunday: [],
        };

        DAYS.forEach(day => {
            if (weekSchedule[day]) {
                orderedWeekSchedule[day] = weekSchedule[day];
            }
        });

        return orderedWeekSchedule;
    }, [processedCourses]);

    useEffect(() => {
        console.log(activeSchedule);
        console.log(generateWeekSchedule());
        console.log(processedCourses);
    }, [activeSchedule, processedCourses, generateWeekSchedule]);

    return (
        <div>
            <header className='flex items-center gap-5 overflow-x-auto overflow-y-hidden border-b border-ut-offwhite px-7 py-4 md:overflow-x-hidden'>
                <LargeLogo />
                <Divider className='mx-2 self-center md:mx-4' size='2.5rem' orientation='vertical' />
                <Text variant='h1' className='flex-1 text-ut-burntorange'>
                    UTRP Map
                </Text>
                <div className='hidden flex-row items-center justify-end gap-6 screenshot:hidden lg:flex'>
                    <Button variant='single' color='theme-black' onClick={handleChangelogOnClick}>
                        <IconoirGitFork className='h-6 w-6 text-ut-gray' />
                        <Text variant='small' className='text-ut-gray font-normal'>
                            v{manifest.version} - {process.env.NODE_ENV}
                        </Text>
                    </Button>
                    <img src={LDIconURL} alt='LD Icon' className='h-10 w-10 rounded-lg' />
                </div>
            </header>
            <div className='h-full flex flex-row'>
                <div className='h-full flex flex-none flex-col justify-between pb-5 screenshot:hidden'>
                    <div className='mb-3 h-full w-fit flex flex-col overflow-auto pb-2 pl-4.5 pr-4 pt-5'>
                        <CalendarSchedules />
                        <Divider orientation='horizontal' size='100%' className='my-5' />
                        <ImportantLinks />
                        <Divider orientation='horizontal' size='100%' className='my-5' />
                        <TeamLinks />
                    </div>
                    <CalendarFooter />
                </div>
                <div className='flex p-12'>
                    <CampusMap />
                </div>

                {/* Show week schedule */}
                <div className='flex flex-col py-12'>
                    <p className='text-lg font-medium'>Week Schedule:</p>
                    {Object.entries(generateWeekSchedule()).map(([day, courses]) => (
                        <div key={day} className='flex flex-col pb-4'>
                            <p className='text-sm font-medium'>{day}</p>
                            <ul>
                                {courses.map(course => (
                                    <li key={course} className='text-xs'>
                                        {course}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
