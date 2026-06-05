import { describe, expect, it } from 'vitest';

import { ROOT_GROUPS } from './flow-files-constants';

describe('flow file group labels', () => {
    it('uses Korean labels for visible root groups', () => {
        expect(ROOT_GROUPS.map((group) => group.label)).toEqual(['업로드', '자료', '컨테이너']);
    });
});
