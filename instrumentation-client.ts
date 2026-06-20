import { initBotId } from 'botid/client/core';

import { BOTID_PROTECTED_ROUTES } from '@/lib/security/botid';

initBotId({
    protect: [...BOTID_PROTECTED_ROUTES],
});
