/** @jsxImportSource @emotion/react */
import * as s from './style';

function MainContainer({children}) {
    return (
        <div css={s.wrap}>
            {children}
        </div>
    );
}

export default MainContainer;