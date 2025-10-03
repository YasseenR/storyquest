//project-aac-game-team-b/StoryQuest/app/page.tsx

import AnimatedTitle from './HomePage/AnimatedTitle';
//import {CompletionTestButton, CreateButton, JoinButton, TemporaryTestingGameButton} from "./HomePage/HomePageButtons";
import { CreateButton, JoinButton} from "./HomePage/HomePageButtons";
import Link from 'next/link';
import "./HomePage/HomePageStyles.css";
import {HomePageBackgroundMusic} from "./HomePage/HomePageBackgroundMusic";
import React from 'react';


export default function Home() {
    return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-cover bg-center overflow-hidden"
             style={{
                 backgroundImage: "url('/images/home-background.jpg')",
             }}>

            {/*Main Content Div*/}    
            <div className="flex flex-col items-center justify-start w-full h-full pt-[60px] relative">
                
                {/*Title with animation*/}
            <div className="flex justify-center items-center py-[50px]">
                <AnimatedTitle/>
            </div>

            {/*Buttons Div*/}
            <div className="flex flex-col md:flex-row justify-center items-center">

                {/*CreateButton navigates to create room page*/}
                <div className="py-[10px]">
                    <div className="border-[5px] border-white rounded-[45px] inline-block m-[10px] shadow-lg">
                        <Link href="/CreateRoom" className='block'>
                            <CreateButton/>
                        </Link>
                    </div>
                </div>


                {/*JoinButton navigates to join room page*/}

                <div className="py-[10px]">
                    <div className="border-[5px] border-white rounded-[45px] inline-block m-[10px] shadow-lg">
                        <Link href="/JoinRoom" className='block'>
                            <JoinButton/>
                        </Link>
                    </div>
                </div>
            </div>

            {/*Copyright text*/}
            <footer>
                {/*Background music, with play and stop buttons*/}
                <div className="music-slider-container">
                    <HomePageBackgroundMusic/>
                </div>
                <h1 className="copyright-text" >Copyright © 2025 StoryQuest</h1>
            </footer>
        </div>
        </div>
    );
}