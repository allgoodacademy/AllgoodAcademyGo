// GENERATED FILE — DO NOT EDIT BY HAND.
// Produced by scripts/build-mission-control-data.js from the modules themselves:
// SCENARIO_DATA in the Digital Decisions Challenge, and CASE_TITLES / CASE_CHOICES in each
// lab. Edit those arrays and re-run the script; `node scripts/check-modules.js` fails if
// this file has drifted from them.
//
// indexBase records how each module numbers the scenarioIndex it writes to
// scenario_attempts: the Challenge is 1-based, every lab is 0-based.
export const MODULE_DATA = {
  "ddc": {
    "id": "ddc",
    "name": "Digital Decisions",
    "slug": "digital-decisions",
    "gameNames": [
      "Digital Decisions Challenge"
    ],
    "kind": "challenge",
    "indexBase": 1,
    "stepsTotal": 30,
    "steps": [
      {
        "title": "Your classmate posts a picture of your group project online without getting your permission. Question: What do you do?",
        "category": "social_intelligence",
        "choices": [
          {
            "text": "Say nothing and ignore the post, hoping it will go away.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Post a mean comment on their picture telling them to take it down immediately.",
            "score": 0,
            "effectiveness": "least-effective"
          },
          {
            "text": "Politely message them to ask them to take it down, explaining why you're uncomfortable.",
            "score": 3,
            "effectiveness": "most-effective"
          }
        ]
      },
      {
        "title": "You get into a heated debate with a stranger in the comments section of a social media post. Question: What do you do?",
        "category": "social_intelligence",
        "choices": [
          {
            "text": "Use an 'I' statement to express your point of view calmly and then disengage from the conversation.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Use personal attacks to try and win the argument.",
            "score": 0,
            "effectiveness": "least-effective"
          },
          {
            "text": "Say nothing and leave the conversation.",
            "score": 1,
            "effectiveness": "less-effective"
          }
        ]
      },
      {
        "title": "You are applying for a job, and the company asks for your social media handles. Question: What do you do?",
        "category": "professional_brand",
        "choices": [
          {
            "text": "You curate your social media to reflect your professional goals and then share it.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "You delete all your social media accounts before giving them your handles.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "You give them all your social media handles without reviewing them.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "Your friend sends you a link to a 'free gift card' survey. It asks for your personal information, including your full name and address. Question: What do you do?",
        "category": "privacy_security",
        "choices": [
          {
            "text": "Fill out the survey with your real information to get the reward.",
            "score": 0,
            "effectiveness": "least-effective"
          },
          {
            "text": "Delete the message and warn your friend that it might be a scam.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Ask your friend if they have used it successfully and if it's safe.",
            "score": 1,
            "effectiveness": "less-effective"
          }
        ]
      },
      {
        "title": "You want to use a picture you found on Google for your school presentation. The picture is not labeled for reuse. Question: What do you do?",
        "category": "digital_citizenship",
        "choices": [
          {
            "text": "Search for the original creator and ask for permission.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Use the image anyway since it's on the internet and easy to find.",
            "score": 0,
            "effectiveness": "least-effective"
          },
          {
            "text": "Use the image anyway and give credit to 'Google Images.'",
            "score": 1,
            "effectiveness": "less-effective"
          }
        ]
      },
      {
        "title": "You see a post from your classmate making fun of another student. The comments are full of hateful remarks. Question: What do you do?",
        "category": "social_intelligence",
        "choices": [
          {
            "text": "Report the post and privately message the person being bullied to offer support.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Like the post to fit in with your friends.",
            "score": 0,
            "effectiveness": "least-effective"
          },
          {
            "text": "Comment on the post, telling everyone to stop being so mean.",
            "score": 1,
            "effectiveness": "less-effective"
          }
        ]
      },
      {
        "title": "You're taking an online class and your classmate posts something with a clear mistake. Question: What do you do?",
        "category": "social_intelligence",
        "choices": [
          {
            "text": "Privately message your classmate with constructive feedback and offer to help.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Post a public comment correcting their mistake so everyone can learn.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Say nothing and ignore the mistake.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "You receive a friend request on social media from a person you don't know. Question: What do you do?",
        "category": "privacy_security",
        "choices": [
          {
            "text": "Ignore the request and review your privacy settings to make sure your profile is private.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Accept the request and then immediately send them a message asking who they are.",
            "score": 0,
            "effectiveness": "least-effective"
          },
          {
            "text": "Accept the request; the more friends you have, the more popular you seem.",
            "score": 1,
            "effectiveness": "less-effective"
          }
        ]
      },
      {
        "title": "You're scrolling through social media, and a pop-up appears, claiming your phone has a virus and you need to download a special app to fix it. Question: What do you do?",
        "category": "privacy_security",
        "choices": [
          {
            "text": "Show it to your parents or a trusted adult to get their opinion.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Close the pop-up and run a scan with your phone's built-in security software.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Immediately tap the pop-up and follow the instructions to get rid of the virus.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "Your teacher has asked you to use a specific website for research, but you've found a different website that seems to have more information. You have never heard of this new website before. Question: What do you do?",
        "category": "digital_citizenship",
        "choices": [
          {
            "text": "Use both websites and check to see if the information is the same.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Use the new website because it has more information.",
            "score": 0,
            "effectiveness": "least-effective"
          },
          {
            "text": "Stick to the website your teacher has provided because it is a reliable source.",
            "score": 3,
            "effectiveness": "most-effective"
          }
        ]
      },
      {
        "title": "You are creating a new account and are asked to create a new password. You're eager to start using the app. Question: What do you do?",
        "category": "privacy_security",
        "choices": [
          {
            "text": "Use the same password you use for everything else because it's easy to remember.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Create a complex password with a mix of letters, numbers, and symbols that is unique to this account.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Use your birthdate or a simple name because it is easy to remember.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "You notice your friend is constantly online and seems to be neglecting their schoolwork and other responsibilities. Question: What do you do?",
        "category": "social_intelligence",
        "choices": [
          {
            "text": "Make a public post about how your friend needs to get off their phone.",
            "score": 0,
            "effectiveness": "least-effective"
          },
          {
            "text": "Use an 'I' statement to express your concern to your friend privately.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Do nothing because it's their life and their choices.",
            "score": 1,
            "effectiveness": "less-effective"
          }
        ]
      },
      {
        "title": "You want to share a funny meme online. You found the meme on a popular page, but you don't know who created it. Question: What do you do?",
        "category": "digital_citizenship",
        "choices": [
          {
            "text": "Share the meme without a second thought.",
            "score": 0,
            "effectiveness": "least-effective"
          },
          {
            "text": "Try to find the original creator and tag them in your post.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Add 'Credit to the creator' to your post.",
            "score": 1,
            "effectiveness": "less-effective"
          }
        ]
      },
      {
        "title": "You see a post online with a picture of a friend looking sad and a caption that says, 'Don't talk to me today.' Question: What do you do?",
        "category": "social_intelligence",
        "choices": [
          {
            "text": "Privately message them to ask if they're okay and offer to listen.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Do nothing. You don't want to bother them since they asked not to be talked to.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Leave a public comment asking if they're okay and what's wrong.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "Two of your classmates in a group chat for a project start arguing about who should do what part of the project. Question: What do you do?",
        "category": "social_intelligence",
        "choices": [
          {
            "text": "Try to mediate the conflict by suggesting a compromise or a new way of dividing the work.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Say nothing and let them work it out on their own.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Take a side and start arguing with one of them to help your friend win.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "You're doing research for a history project and find a blog post with great information, but the author isn't a historian. Question: What do you do?",
        "category": "digital_citizenship",
        "choices": [
          {
            "text": "Use the information anyway because it's a good source.",
            "score": 0,
            "effectiveness": "least-effective"
          },
          {
            "text": "Use the information but cite it as a blog post.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Cross-reference the information with at least two other, more reliable sources (like a university website or a verified encyclopedia).",
            "score": 3,
            "effectiveness": "most-effective"
          }
        ]
      },
      {
        "title": "You are asked to review a new learning app for school and find a minor bug. Question: What do you do?",
        "category": "professional_brand",
        "choices": [
          {
            "text": "Privately message the developers with a detailed, constructive report of the bug.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Say nothing and hope the developers find the bug themselves.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Leave a scathing review online, detailing all the bugs you found and how terrible the app is.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "You see a post from your classmate that makes a joke about a sensitive topic, and some people in the comments are hurt by it. Question: What do you do?",
        "category": "social_intelligence",
        "choices": [
          {
            "text": "Privately message your classmate, explaining why the post was hurtful and suggesting they take it down.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Do nothing because it's not your problem.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Leave a comment to tell the person who made the post that they should apologize.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "You are creating a profile for a new app. It asks for your real name, birthdate, and where you live. Question: What do you do?",
        "category": "privacy_security",
        "choices": [
          {
            "text": "Provide all the requested information because it's required to create an account.",
            "score": 0,
            "effectiveness": "least-effective"
          },
          {
            "text": "Close the app and don't create an account.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Create an account with a fake name and birthdate to protect your privacy.",
            "score": 3,
            "effectiveness": "most-effective"
          }
        ]
      },
      {
        "title": "You are working on a group project with a classmate. You notice they are not doing their part and are just copying and pasting from Wikipedia. Question: What do you do?",
        "category": "professional_brand",
        "choices": [
          {
            "text": "Privately message your classmate with a constructive message to tell them that you are worried about their work and offer to help.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Call them out in the group chat for being lazy and not doing their part.",
            "score": 0,
            "effectiveness": "least-effective"
          },
          {
            "text": "Just do their work for them so you get a good grade.",
            "score": 1,
            "effectiveness": "less-effective"
          }
        ]
      },
      {
        "title": "You are asked to create a new password for a new social media account. You are asked to create a strong password, but you just want to get to the app. Question: What do you do?",
        "category": "privacy_security",
        "choices": [
          {
            "text": "Use a simple password that is easy to remember, like 'password123'.",
            "score": 0,
            "effectiveness": "least-effective"
          },
          {
            "text": "Use your school email address as your password.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Create a password that is complex and unique to this account.",
            "score": 3,
            "effectiveness": "most-effective"
          }
        ]
      },
      {
        "title": "You're in a group chat for a class project, and one of your classmates posts a private message that you sent them to the group chat. Question: What do you do?",
        "category": "social_intelligence",
        "choices": [
          {
            "text": "Take a screenshot of the message and post it to social media to call out your classmate.",
            "score": 0,
            "effectiveness": "least-effective"
          },
          {
            "text": "Ask the person to delete the message and explain to them why it was wrong.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Tell the teacher and ask them to remove the classmate from the group.",
            "score": 1,
            "effectiveness": "less-effective"
          }
        ]
      },
      {
        "title": "You are scrolling through social media, and you see a post from a friend that is promoting a fake charity. Question: What do you do?",
        "category": "digital_citizenship",
        "choices": [
          {
            "text": "Leave a comment on the post saying that the charity is fake.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Do nothing and ignore the post, so you don't hurt your friend's feelings.",
            "score": 0,
            "effectiveness": "least-effective"
          },
          {
            "text": "Privately message your friend and explain to them why the charity is fake and why they should take the post down.",
            "score": 3,
            "effectiveness": "most-effective"
          }
        ]
      },
      {
        "title": "You are completing an online survey for a product you like. It asks for your parents' names, phone numbers, and income. Question: What do you do?",
        "category": "privacy_security",
        "choices": [
          {
            "text": "Fill out the survey with your real information to get the reward.",
            "score": 0,
            "effectiveness": "least-effective"
          },
          {
            "text": "Close the survey immediately and do not provide the information.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Fill out the survey with fake information.",
            "score": 1,
            "effectiveness": "less-effective"
          }
        ]
      },
      {
        "title": "You're playing a multiplayer video game and another player is being very aggressive and using offensive language in the chat. Question: What do you do?",
        "category": "digital_citizenship",
        "choices": [
          {
            "text": "Report the player's behavior to the platform's moderators and mute/block them.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Argue back with them and use your own insults to defend yourself.",
            "score": 0,
            "effectiveness": "least-effective"
          },
          {
            "text": "Say nothing and leave the game immediately.",
            "score": 1,
            "effectiveness": "less-effective"
          }
        ]
      },
      {
        "title": "A friend posts a picture of you online that you think is unflattering. Question: What do you do?",
        "category": "social_intelligence",
        "choices": [
          {
            "text": "Politely message your friend and ask them to remove the picture, explaining how you feel.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Post a mean comment on their picture, telling them to take it down.",
            "score": 0,
            "effectiveness": "least-effective"
          },
          {
            "text": "Ignore it and do nothing. You don't want to make things awkward.",
            "score": 1,
            "effectiveness": "less-effective"
          }
        ]
      },
      {
        "title": "You receive a message from an unknown number. It says, 'Hey, I think I have the wrong number, but you seem cool. What's your name?' Question: What do you do?",
        "category": "privacy_security",
        "choices": [
          {
            "text": "Block the number and don't respond.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Reply and give them your name and a brief description of yourself.",
            "score": 0,
            "effectiveness": "least-effective"
          },
          {
            "text": "Reply and say, 'I think you have the wrong number.'",
            "score": 1,
            "effectiveness": "less-effective"
          }
        ]
      },
      {
        "title": "You're in a video meeting for an online class, and you see a classmate live-tweeting the lecture, making fun of the professor. Question: What do you do?",
        "category": "professional_brand",
        "choices": [
          {
            "text": "Do nothing; it's not your business.",
            "score": 0,
            "effectiveness": "least-effective"
          },
          {
            "text": "Screenshot the tweets and send them to the professor to get your classmate in trouble.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Privately message your classmate and explain why what they are doing could be disrespectful and have serious consequences.",
            "score": 3,
            "effectiveness": "most-effective"
          }
        ]
      },
      {
        "title": "You discover someone has created a fake social media profile using a friend's name and photos to post mean things about other students. Question: What do you do?",
        "category": "social_intelligence",
        "choices": [
          {
            "text": "Report the fake account to the social media platform and then block it.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Privately message your friend and offer to help them report the account and alert others.",
            "score": 3,
            "effectiveness": "most-effective"
          },
          {
            "text": "Create a public post to warn everyone about the fake account and call out the person who created it.",
            "score": 0,
            "effectiveness": "least-effective"
          }
        ]
      },
      {
        "title": "You see a post from a friend that is promoting a charity. The post looks legitimate, but you have never heard of the charity before. Question: What do you do?",
        "category": "digital_citizenship",
        "choices": [
          {
            "text": "Donate to the charity and share the post, assuming it's a good cause.",
            "score": 0,
            "effectiveness": "least-effective"
          },
          {
            "text": "Do nothing and ignore the post.",
            "score": 1,
            "effectiveness": "less-effective"
          },
          {
            "text": "Research the charity to see if it's legitimate before donating or sharing the post.",
            "score": 3,
            "effectiveness": "most-effective"
          }
        ]
      }
    ]
  },
  "social-intelligence": {
    "id": "social-intelligence",
    "name": "Social Intelligence",
    "slug": "social-intelligence",
    "gameNames": [
      "Social Intelligence"
    ],
    "kind": "lab",
    "indexBase": 0,
    "stepsTotal": 7,
    "steps": [
      {
        "title": "What We're Covering",
        "category": null,
        "choices": null
      },
      {
        "title": "The Inciting Incident",
        "category": null,
        "choices": [
          {
            "text": "Fired back publicly",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Went quiet and vented to friends",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Sent Marcus a private DM",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "The Theater Trap",
        "category": null,
        "choices": [
          {
            "text": "Moved the conversation out of the arena",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "The Script Lab",
        "category": null,
        "choices": [
          {
            "text": "Attack · Pile-on · Ultimatum",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Attack · Pile-on · Clear ask",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Attack · Named stake · Ultimatum",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Attack · Named stake · Clear ask",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Observation · Pile-on · Ultimatum",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Observation · Pile-on · Clear ask",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Observation · Named stake · Ultimatum",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Observation · Named stake · Clear ask",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "The Ally Protocol",
        "category": null,
        "choices": [
          {
            "text": "Defended Sarah in the comments",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Reported quietly and backed her up in private",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "The Temperature Check",
        "category": null,
        "choices": [
          {
            "text": "Took the three-second reset before replying",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "Handoff",
        "category": null,
        "choices": null
      }
    ]
  },
  "privacy-security": {
    "id": "privacy-security",
    "name": "Privacy & Security",
    "slug": "privacy-security",
    "gameNames": [
      "Privacy & Security"
    ],
    "kind": "lab",
    "indexBase": 0,
    "stepsTotal": 6,
    "steps": [
      {
        "title": "One Saturday, Four Moments",
        "category": null,
        "choices": null
      },
      {
        "title": "The Scam Sort",
        "category": null,
        "choices": [
          {
            "text": "Called it correctly",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Let it past",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "The Permission Calibration",
        "category": null,
        "choices": [
          {
            "text": "Left the flashlight on, denied the rest",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "The Password Pressure Test",
        "category": null,
        "choices": [
          {
            "text": "Cleared the bar",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Well past the bar",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "The DM Redirect",
        "category": null,
        "choices": [
          {
            "text": "Named all three asks, and nothing that wasn't there",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "Handoff",
        "category": null,
        "choices": null
      }
    ]
  },
  "professional-brand": {
    "id": "professional-brand",
    "name": "Professional Brand",
    "slug": "professional-brand",
    "gameNames": [
      "Professional Brand"
    ],
    "kind": "lab",
    "indexBase": 0,
    "stepsTotal": 7,
    "steps": [
      {
        "title": "One Week, Five Moments",
        "category": null,
        "choices": null
      },
      {
        "title": "What They Find",
        "category": null,
        "choices": [
          {
            "text": "Led with the side project",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Led with the food bank photo",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Led with the team win",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Led with the vent",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Led with the joke",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Led with the meme",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "The Draft",
        "category": null,
        "choices": [
          {
            "text": "Sent the rewritten version",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "The Group Project",
        "category": null,
        "choices": [
          {
            "text": "Pulled Luis aside",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Told Luis straight",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Quietly fixed it himself",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Said it in the group chat",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "The Class Thread",
        "category": null,
        "choices": [
          {
            "text": "Messaged before the screenshot",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Messaged after the screenshot",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Messaged once it was already spreading",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Never pressed it",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "Friday",
        "category": null,
        "choices": [
          {
            "text": "First pick",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Second pick",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Third pick",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "Handoff",
        "category": null,
        "choices": null
      }
    ]
  },
  "digital-citizenship": {
    "id": "digital-citizenship",
    "name": "Digital Citizenship",
    "slug": "digital-citizenship",
    "gameNames": [
      "Digital Citizenship"
    ],
    "kind": "lab",
    "indexBase": 0,
    "stepsTotal": 7,
    "steps": [
      {
        "title": "One Week, Five Moments",
        "category": null,
        "choices": null
      },
      {
        "title": "The Source Check",
        "category": null,
        "choices": [
          {
            "text": "Built a stack that holds",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "The Credit Trail",
        "category": null,
        "choices": [
          {
            "text": "Named her, linked her, asked her",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "The One You've Never Heard Of",
        "category": null,
        "choices": [
          {
            "text": "Didn't share it",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "The One You Know Is Fake",
        "category": null,
        "choices": [
          {
            "text": "Told Della first, then reported",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Reported first, then told Della",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "The Toxic Lobby",
        "category": null,
        "choices": [
          {
            "text": "Used the tools and never answered him",
            "score": null,
            "effectiveness": null
          },
          {
            "text": "Used the tools, but replied first",
            "score": null,
            "effectiveness": null
          }
        ]
      },
      {
        "title": "Handoff",
        "category": null,
        "choices": null
      }
    ]
  }
};

export default MODULE_DATA;
